# -*- coding: utf-8 -*-
"""Update products.csv prices from ghfqc.xls columns C,D,E,F."""
import pandas as pd
import csv
import os
import re

XLS_PATH = r'c:\Users\kla98\Downloads\ghfqc.xls'
CSV_PATH = r'c:\Users\kla98\b2b-catalog\data\products.csv'

def norm(s):
    """Normalize name for matching: lowercase, remove extra spaces, (No Name)."""
    if not s or str(s) == 'nan': return ''
    s = str(s).strip().lower()
    s = re.sub(r'\s+', ' ', s)
    s = s.replace('(no name)', '').replace('( no name )', '').strip()
    return s

def parse_price(v):
    try:
        x = float(v)
        return round(x, 2)
    except (TypeError, ValueError):
        return None

# Read XLS: row 5 = headers, data from row 6. Col A=0 name, C=2 D=3 E=4 F=5
df = pd.read_excel(XLS_PATH, header=None)
xls_prices = {}
for i in range(6, len(df)):
    name = str(df.iloc[i, 0]).strip()
    if not name or name == 'nan': continue
    p200 = parse_price(df.iloc[i, 2])   # ДО 200
    p200p = parse_price(df.iloc[i, 3])  # ОТ 200 -500
    p500p = parse_price(df.iloc[i, 4])  # ОТ 500
    pcont = parse_price(df.iloc[i, 5])  # КОНТЕЙНЕР
    if p200 is not None or p200p is not None:
        xls_prices[norm(name)] = (p200, p200p, p500p, pcont)

# Read CSV
with open(CSV_PATH, encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    rows = list(reader)

# Manual mappings for names that differ between XLS and CSV
ALIASES = {
    'саипа-165': 'фотон 165new',
    'сварочный полуавтомат инверторный фотон саипа-170 проф': 'фотон 170 проф',
    'саипа-190с': 'фотон 190new edon',
    'миг-250': 'фотон миг 250',
    'саипа-250c': 'фотон саипа 250с',
}
for k, v in list(ALIASES.items()):
    if v in xls_prices:
        xls_prices[k] = xls_prices[v]

# Update prices
updated = 0
for row in rows:
    name = row.get('name') or ''
    key = norm(name)
    vals = xls_prices.get(key)
    if not vals:
        for xkey, v in xls_prices.items():
            if len(xkey) > 10 and (xkey in key or key in xkey):
                vals = v
                break
    if vals:
        p200, p200p, p500p, pcont = vals
        if p200 is not None: row['price_200'] = f'{p200:.2f}'
        if p200p is not None: row['price_200_plus'] = f'{p200p:.2f}'
        if p500p is not None: row['price_500_plus'] = f'{p500p:.2f}'
        if pcont is not None: row['price_container'] = f'{pcont:.2f}'
        updated += 1
        print(f'OK: {(name or "?")[:55]}')

# Write CSV - preserve structure, strip trailing semicolons from output
def clean_val(v):
    return (v or '').split(';')[0].strip()

with open(CSV_PATH, 'w', encoding='utf-8', newline='') as f:
    fn = [c for c in fieldnames if c and not c.startswith(';')]
    if not fn: fn = ['image','name','description','package','category','price_200','price_200_plus','price_500_plus','price_container','rrp','hit']
    writer = csv.DictWriter(f, fieldnames=fn, extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        out = {k: clean_val(row.get(k, '')) for k in fn}
        writer.writerow(out)

print(f'\nUpdated {updated} products. Run: python build.py')
