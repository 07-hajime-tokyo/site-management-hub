#!/usr/bin/env python3
"""Build the static eBay research dashboard data from the result workbook."""

from __future__ import annotations

import json
import math
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote

import pandas as pd


FX_JPY = 150
EBAY_FEE_RATE = 0.15
CUSTOMS_DUTY_RATE = 0.10
PAYOUT_RATE = 1 - EBAY_FEE_RATE
JST = timezone(timedelta(hours=9))


def clean_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    return str(value).strip()


def clean_number(value, default=0.0) -> float:
    if value is None:
        return default
    if isinstance(value, float) and math.isnan(value):
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).replace(",", "").replace("%", "").strip()
    if not text:
        return default
    try:
        return float(text)
    except ValueError:
        return default


def clean_int(value, default=0) -> int:
    return int(round(clean_number(value, default)))


def normalize_title(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    stop = {
        "used",
        "new",
        "japan",
        "japanmodel",
        "right",
        "hand",
        "handed",
        "rh",
        "with",
        "w",
    }
    return " ".join(token for token in text.split() if token not in stop)


def estimate_hts(title: str, shipping_class: str) -> dict:
    title_l = title.lower()
    if re.search(r"\b(caddie|caddy|cart bag|stand bag|carry bag|golf bag)\b", title_l):
        return {
            "code": "4202.91.10.00",
            "label": "Golf bags",
            "officialDutyRate": 0.045,
            "confidence": "要確認",
            "referenceUrl": "https://hts.usitc.gov/search?query=4202911000",
        }
    if re.search(r"\b(head only|shaft|shafts|adapter|sleeve|wrench|headcover|head cover)\b", title_l):
        return {
            "code": "9506.39.00.60",
            "label": "Parts of golf clubs",
            "officialDutyRate": 0.049,
            "confidence": "候補",
            "referenceUrl": "https://hts.usitc.gov/search?query=9506390060",
        }
    if re.search(r"\b(iron ?set|club set|complete set|driver|fairway|wood|hybrid|utility|wedge|putter)\b", title_l):
        return {
            "code": "9506.31.00.00",
            "label": "Golf clubs, complete",
            "officialDutyRate": 0.044,
            "confidence": "候補",
            "referenceUrl": "https://hts.usitc.gov/search?query=9506310000",
        }
    if shipping_class == "大型":
        return {
            "code": "9506.31.00.00",
            "label": "Golf clubs, complete",
            "officialDutyRate": 0.044,
            "confidence": "要確認",
            "referenceUrl": "https://hts.usitc.gov/search?query=9506310000",
        }
    return {
        "code": "9506.39.00.80",
        "label": "Other golf equipment",
        "officialDutyRate": 0.049,
        "confidence": "要確認",
        "referenceUrl": "https://hts.usitc.gov/search?query=9506390080",
    }


def split_shipping(total_shipping_jpy: int, shipping_class: str) -> dict:
    ninja_by_class = {
        "小型": 900,
        "中型": 1500,
        "長尺": 2200,
        "大型": 3800,
    }
    ninja = ninja_by_class.get(shipping_class, min(1800, total_shipping_jpy))
    ninja = min(ninja, total_shipping_jpy)
    return {
        "ninjaToOregonJpy": ninja,
        "oregonToBuyerJpy": max(total_shipping_jpy - ninja, 0),
        "totalLogisticsJpy": total_shipping_jpy,
    }


def packaging(title: str, shipping_class: str) -> dict:
    title_l = title.lower()
    if re.search(r"\b(caddie|caddy|cart bag|stand bag|carry bag|golf bag)\b", title_l):
        return {
            "size": "160-180サイズ",
            "material": "ゴルフバッグ用カバーまたは大型ダンボール",
            "note": "フード、脚、底面を厚めに保護。重量があるため角つぶれに注意。",
        }
    if re.search(r"\b(shaft|shafts)\b", title_l):
        return {
            "size": "120-140長尺",
            "material": "長尺ダンボールまたは紙管 + 両端キャップ",
            "note": "曲がり防止を最優先。中で動かないよう中央も固定。",
        }
    if re.search(r"\b(driver|fairway|wood|hybrid|utility|wedge|putter)\b", title_l) and "head only" not in title_l:
        return {
            "size": "120-140長尺",
            "material": "ゴルフクラブ用長尺箱 + ヘッド緩衝材",
            "note": "ヘッド、グリップ、シャフト中央の3点を固定。",
        }
    if re.search(r"\b(head only|headcover|head cover|wrench)\b", title_l) or shipping_class == "小型":
        return {
            "size": "80サイズ目安",
            "material": "小型ダンボール + プチプチ二重",
            "note": "ヘッドの角とフェース面を重点保護。ヘッドカバー同梱時は擦れ防止。",
        }
    if shipping_class == "大型":
        return {
            "size": "140-160サイズ",
            "material": "アイアンセット用長尺箱 + 個別ヘッド保護",
            "note": "番手ごとにヘッドを包み、束ねて箱内で暴れないよう固定。",
        }
    return {
        "size": "100-120サイズ",
        "material": "標準ダンボール + 緩衝材",
        "note": "商品形状に応じて箱内の余白を詰める。",
    }


def pick_domestic_source(row: dict) -> dict:
    candidates = [
        ("Yahooオークション", clean_text(row.get("Yahooオークション"))),
        ("メルカリ", clean_text(row.get("メルカリ"))),
        ("楽天", clean_text(row.get("楽天"))),
        ("Amazon", clean_text(row.get("Amazon"))),
        ("専門・補助検索", clean_text(row.get("専門・補助検索"))),
        ("Google", clean_text(row.get("Google"))),
    ]
    for label, url in candidates:
        if url:
            return {"label": label, "url": url, "imageUrl": ""}
    return {"label": "未設定", "url": "", "imageUrl": ""}


def build_makse_url(keyword: str, title: str) -> str:
    query = keyword or title
    return (
        "https://www.ebay.com/sch/i.html"
        f"?_ssn=makse2313&_nkw={quote(query)}&LH_Sold=1&LH_Complete=1&_sop=16"
    )


def build_ebay_keyword_research_url(keyword: str, title: str) -> str:
    query = keyword or title
    return (
        "https://www.ebay.com/sh/research"
        f"?marketplace=EBAY-US&keywords={quote(query)}&dayRange=90&categoryId=0"
        "&offset=0&limit=50&tabName=SOLD&tz=Asia%2FTokyo"
    )


def build_self_listing_url(keyword: str, title: str) -> str:
    query = keyword or title
    return f"https://www.ebay.com/sch/i.html?_ssn=good-select-jp&_nkw={quote(query)}"


def build_sellerhacks_url(keyword: str, title: str) -> str:
    query = keyword or title
    return (
        "https://sellerhacks.work/search/"
        f"?keyword={quote(query)}&form_radio=title_type&lowest=1&highest=10000&condition=ALL&sort=-price"
    )


def build_specialist_source(domestic_keyword: str, title: str, existing_url: str) -> dict:
    query = domestic_keyword or title
    golf_partner = f"https://www.google.com/search?q={quote(query + ' site:golfpartner.co.jp')}"
    golf_do = f"https://www.google.com/search?q={quote(query + ' site:golfdo.com')}"
    return {
        "label": "ゴルフ専門店候補",
        "url": existing_url or golf_partner,
        "imageUrl": "",
        "links": [
            {"label": "ゴルフパートナー", "url": golf_partner},
            {"label": "ゴルフ・ドゥ", "url": golf_do},
        ],
    }


def extract_product_specs(title: str) -> dict:
    text = title.lower()
    loft_match = re.search(r"(?<!\d)(\d{1,2}(?:\.\d)?)\s*(?:deg|degree|°)", text)
    set_match = re.search(
        r"\b([3-9](?:\s*[-/]\s*(?:[3-9])?)?(?:(?:pw|aw|sw|gw|lw|p|a|s)\s*){1,4})\b",
        text,
    )
    pcs_match = re.search(r"(\d+)\s*(?:pc|pcs|piece)", text)
    flex_match = re.search(r"(?:flex[- ]?)\s*(ladies|senior|regular|stiff|x-stiff|[lrsx])\b", text)
    shaft_match = re.search(
        r"\b((?:tour|tensei|fubuki|speeder|ventus|kbs|ns\.?pro|n\.s\.pro|zelos|diamana|chrome|graphite|steel)[a-z0-9 .+-]*?)(?:\s+flex|\s+right|\s+left|\s+rh|\s+lh|\s+used|\s+new|$)",
        text,
    )

    if "head only" in text:
        component = "ヘッドのみ"
    elif "shaft" in text or "graphite" in text or "steel" in text:
        component = "シャフト付き/セット"
    elif "bag" in text:
        component = "バッグ"
    else:
        component = "本体/構成未確定"

    if re.search(r"\b(left hand|left-handed|lh)\b", text):
        handedness = "左利き"
    elif re.search(r"\b(right hand|right-handed|rh)\b", text):
        handedness = "右利き"
    else:
        handedness = "未記載"

    club_type = "その他"
    club_patterns = [
        ("shaft", "シャフト"),
        ("driver", "ドライバー"),
        ("fairway|\\bfw\\b|wood", "フェアウェイウッド"),
        ("hybrid|utility|\\but\\b", "ユーティリティ"),
        ("iron", "アイアン"),
        ("wedge", "ウェッジ"),
        ("putter", "パター"),
        ("caddie|caddy|cart bag|stand bag|carry bag|golf bag", "キャディバッグ"),
    ]
    for pattern, label in club_patterns:
        if re.search(pattern, text):
            club_type = label
            break

    return {
        "component": component,
        "handedness": handedness,
        "clubType": club_type,
        "loft": f"{loft_match.group(1)}°" if loft_match else "未記載",
        "setComposition": set_match.group(1).upper().replace(" ", "") if set_match else "未記載",
        "pieceCount": f"{pcs_match.group(1)}pc" if pcs_match else "未記載",
        "shaft": shaft_match.group(1).strip().upper() if shaft_match else "未記載",
        "flex": flex_match.group(1).upper() if flex_match else "未記載",
        "confidence": "タイトル推定",
    }


def safe_link(value: str) -> str:
    value = clean_text(value)
    return value if value.startswith("http://") or value.startswith("https://") else ""


def row_to_item(row: dict) -> dict:
    title = clean_text(row.get("商品名"))
    item_no = clean_int(row.get("#"))
    ebay_price_usd = clean_number(row.get("eBay売価(USD)"))
    shipping_usd = clean_number(row.get("送料(USD)"))
    ebay_total_usd = clean_number(row.get("eBay総額(USD)"), ebay_price_usd + shipping_usd)
    domestic_price_jpy = clean_int(row.get("国内価格目安(JPY)"))
    shipping_class = clean_text(row.get("国際輸送区分")) or "中型"
    total_shipping_jpy = clean_int(row.get("送料予測(JPY)"))
    profit_jpy = clean_int(row.get("還付込利益(JPY)"))
    hts = estimate_hts(title, shipping_class)
    duty_jpy = round(domestic_price_jpy * CUSTOMS_DUTY_RATE) if domestic_price_jpy else 0
    payout_jpy = round(ebay_total_usd * FX_JPY * PAYOUT_RATE)
    gross_sales_jpy = round(ebay_total_usd * FX_JPY)
    ebay_fee_jpy = round(gross_sales_jpy * EBAY_FEE_RATE)
    refund_jpy = round(domestic_price_jpy * 10 / 110) if domestic_price_jpy else 0
    profit_after_duty_jpy = profit_jpy - duty_jpy
    margin_after_duty = profit_after_duty_jpy / domestic_price_jpy if domestic_price_jpy else 0
    ebay_kw = clean_text(row.get("eBay検索KW"))
    domestic_kw = clean_text(row.get("国内検索KW"))
    competitor_url = safe_link(row.get("競合出品URL")) or safe_link(row.get("eBay出品"))
    ebay_search_url = safe_link(row.get("eBay出品"))
    product_research_url = safe_link(row.get("eBayプロダクトリサーチ"))
    specialist_source = build_specialist_source(domestic_kw, title, safe_link(row.get("専門・補助検索")))

    links = {
        "competitor": competitor_url,
        "ebaySearch": ebay_search_url,
        "productResearch": product_research_url or build_ebay_keyword_research_url(ebay_kw, title),
        "makse": build_makse_url(ebay_kw, title),
        "ebayKeywordResearchShipToUs": build_ebay_keyword_research_url(ebay_kw, title),
        "amazon": safe_link(row.get("Amazon")),
        "mercari": safe_link(row.get("メルカリ")),
        "surugaya": safe_link(row.get("駿河屋")),
        "yahooAuction": safe_link(row.get("Yahooオークション")),
        "google": safe_link(row.get("Google")),
        "rakuten": safe_link(row.get("楽天")),
        "specialist": safe_link(row.get("専門・補助検索")),
    }
    return {
        "id": f"item-{item_no}",
        "no": item_no,
        "title": title,
        "normalizedTitle": normalize_title(title),
        "category": clean_text(row.get("カテゴリ")),
        "condition": clean_text(row.get("状態")),
        "domesticKeyword": domestic_kw,
        "ebayKeyword": ebay_kw,
        "decision": clean_text(row.get("可否")) or "保留",
        "decisionReason": clean_text(row.get("判定理由")),
        "sold30": clean_int(row.get("30日Sold数")),
        "aiNote": clean_text(row.get("AI考察")),
        "manualMemo": clean_text(row.get("目視メモ1st")),
        "reviewMemo": clean_text(row.get("目視検証")),
        "improvementMemo": clean_text(row.get("改善メモ")),
        "pricing": {
            "fxJpy": FX_JPY,
            "ebayPriceUsd": ebay_price_usd,
            "buyerShippingUsd": shipping_usd,
            "ebayTotalUsd": ebay_total_usd,
            "ebayTotalJpy": gross_sales_jpy,
            "domesticPriceJpy": domestic_price_jpy,
            "priceGapJpy": clean_int(row.get("価格乖離(JPY)")),
            "priceGapRate": clean_number(row.get("価格乖離率")),
        },
        "profit": {
            "ebayFeeRate": EBAY_FEE_RATE,
            "ebayFeeJpy": ebay_fee_jpy,
            "orderEarningJpy": payout_jpy,
            "taxRefundJpy": refund_jpy,
            "dutyRate": CUSTOMS_DUTY_RATE,
            "dutyJpy": duty_jpy,
            "profitJpy": profit_jpy,
            "profitRate": clean_number(row.get("還付込利益率")),
            "profitAfterDutyJpy": profit_after_duty_jpy,
            "profitAfterDutyRate": margin_after_duty,
        },
        "logistics": {
            "shippingClass": shipping_class,
            **split_shipping(total_shipping_jpy, shipping_class),
        },
        "packaging": packaging(title, shipping_class),
        "hts": hts,
        "specs": extract_product_specs(title),
        "domesticSource": pick_domestic_source(row),
        "specialistSource": specialist_source,
        "previewSources": [
            {
                "key": "makse",
                "label": "makse",
                "title": "makse2313のSold/競合確認",
                "url": build_makse_url(ebay_kw, title),
                "imageUrl": "",
                "emptyText": "makse画像URL未取得",
                "note": "元リサーチ対象セラーのSold確認",
            },
            {
                "key": "ebay-research-us",
                "label": "eBay KW Research",
                "title": "Ship to US / EBAY-US",
                "url": product_research_url or build_ebay_keyword_research_url(ebay_kw, title),
                "imageUrl": "",
                "emptyText": "eBay画像URL未取得",
                "note": "90日Soldのキーワード確認",
            },
            {
                "key": "domestic",
                "label": pick_domestic_source(row)["label"],
                "title": domestic_kw or title,
                "url": pick_domestic_source(row)["url"],
                "imageUrl": pick_domestic_source(row)["imageUrl"],
                "emptyText": "国内仕入画像URL未取得",
                "note": "国内仕入先候補",
            },
            {
                "key": "specialist",
                "label": specialist_source["label"],
                "title": "ゴルフパートナー / ゴルフ・ドゥ",
                "url": specialist_source["url"],
                "imageUrl": specialist_source["imageUrl"],
                "emptyText": "専門店画像URL未取得",
                "note": "該当ページは候補検索から確認",
                "links": specialist_source["links"],
            },
        ],
        "links": links,
        "selfListing": {
            "seller": "good-select-jp",
            "status": "未照合",
            "confidence": "セラーハックスCSVまたはeBay出品スナップショット未取得",
            "searchUrl": build_self_listing_url(ebay_kw, title),
            "sellerHacksUrl": build_sellerhacks_url(ebay_kw, title),
            "matchedTitle": "",
            "matchedUrl": "",
        },
    }


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: build-ebay-research-dashboard.py <input.xlsx> <output.json>", file=sys.stderr)
        return 2
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    df = pd.read_excel(input_path, sheet_name="還付込利益判定").fillna("")
    rows = [row_to_item(row) for row in df.to_dict("records") if clean_text(row.get("商品名"))]
    counts = {}
    for item in rows:
        counts[item["decision"]] = counts.get(item["decision"], 0) + 1
    by_class = {}
    for item in rows:
        key = item["logistics"]["shippingClass"]
        by_class[key] = by_class.get(key, 0) + 1

    payload = {
        "meta": {
            "title": "makse2313 eBayリサーチ 還付込利益判定",
            "sourceSpreadsheetId": "1sPwQ_zXqjJEz40T2eU8PdmWA38vH_RqjiTf0fccmmc8",
            "sourceSheetName": "還付込利益判定",
            "sourceSpreadsheetUrl": "https://docs.google.com/spreadsheets/d/1sPwQ_zXqjJEz40T2eU8PdmWA38vH_RqjiTf0fccmmc8/edit",
            "generatedAt": datetime.now(JST).strftime("%Y-%m-%dT%H:%M:%S+09:00"),
            "fxJpy": FX_JPY,
            "ebayFeeRate": EBAY_FEE_RATE,
            "customsDutyRate": CUSTOMS_DUTY_RATE,
            "payoutRate": PAYOUT_RATE,
            "seller": "good-select-jp",
            "listingSnapshotStatus": "未取得",
            "notes": [
                "出品済み判定は未照合です。SellerHacksまたはeBayアクティブ出品のスナップショット投入で精密化できます。",
                "競合出品URLが空の行はeBay検索リンクを競合確認リンクとして表示します。",
                "HTSコードはタイトルからの候補推定です。関税計算はユーザー指定により10%固定です。",
                "写真URLは現時点のシートにないため、SellerHacks CSVや商品ページ由来の画像URLを入れると表示できます。",
            ],
            "sources": [
                {
                    "label": "USITC HTS 9506.39.00.60",
                    "url": "https://hts.usitc.gov/search?query=9506390060",
                },
                {
                    "label": "USITC HTS 9506.31.00.00",
                    "url": "https://hts.usitc.gov/search?query=9506310000",
                },
                {
                    "label": "USITC HTS 4202.91.10.00",
                    "url": "https://hts.usitc.gov/search?query=4202911000",
                },
            ],
        },
        "summary": {
            "total": len(rows),
            "decisionCounts": counts,
            "shippingClassCounts": by_class,
        },
        "items": rows,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {len(rows)} items to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
