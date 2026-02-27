"""
Build script for B2B Product Catalog.
Converts CSV data to JSON with economy/margin calculations.
Run: python build.py
"""

import csv
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'data', 'products.csv')
DIST_DIR = os.path.join(BASE_DIR, 'dist')
JSON_PATH = os.path.join(DIST_DIR, 'products.json')
IMAGES_DIR = os.path.join(DIST_DIR, 'images')

os.makedirs(IMAGES_DIR, exist_ok=True)


def calc_economy(base, discounted):
    if base <= 0:
        return 0
    return round(((base - discounted) / base) * 100, 1)


def calc_margin(rrp, price):
    if rrp <= 0:
        return 0
    return round(((rrp - price) / rrp) * 100, 1)


def csv_to_json():
    with open(CSV_PATH, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        products = []
        for i, row in enumerate(reader, 1):
            p200 = float(row['price_200'].strip() or 0)
            p200p = float(row['price_200_plus'].strip() or 0)
            p500p = float(row['price_500_plus'].strip() or 0)
            pcont = float(row['price_container'].strip() or 0)
            rrp = float(row.get('rrp', '0').strip() or 0)

            prices_list = [p200, p200p, p500p, pcont]
            min_price = min(prices_list)

            products.append({
                'id': i,
                'image': row['image'].strip(),
                'name': row['name'].strip(),
                'description': row['description'].strip(),
                'package': row['package'].strip(),
                'category': row.get('category', '').strip() or 'Без категории',
                'hit': row.get('hit', '').strip().lower() == 'yes',
                'rrp': rrp,
                'prices': {
                    'upTo200': p200,
                    'from200': p200p,
                    'from500': p500p,
                    'container': pcont,
                },
                'economy': {
                    'from200': calc_economy(p200, p200p),
                    'from500': calc_economy(p200, p500p),
                    'container': calc_economy(p200, pcont),
                },
                'margin': {
                    'upTo200': calc_margin(rrp, p200),
                    'from200': calc_margin(rrp, p200p),
                    'from500': calc_margin(rrp, p500p),
                    'container': calc_margin(rrp, pcont),
                },
                'bestPrice': min_price,
            })

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    cats = set(p['category'] for p in products)
    print(f'[CSV -> JSON] {len(products)} products, {len(cats)} categories -> {JSON_PATH}')


def generate_placeholders():
    print('[Images] No placeholder images to generate.')


def generate_icons():
    for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
        fs = int(size * 0.42)
        y = int(size * 0.66)
        x = int(size * 0.11)
        r = int(size * 0.1)
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}">
  <rect width="{size}" height="{size}" rx="{r}" fill="#F57C00"/>
  <text x="{x}" y="{y}" font-size="{fs}" font-weight="700" fill="#fff" font-family="Arial,sans-serif">B2B</text>
</svg>'''
        path = os.path.join(DIST_DIR, name)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(svg)

    print('[Icons] PWA icons generated.')


if __name__ == '__main__':
    csv_to_json()
    generate_placeholders()
    generate_icons()
    print('\nBuild complete! Serve the "dist" folder with any static server.')
    print('Example: python -m http.server 8080 --directory dist')
