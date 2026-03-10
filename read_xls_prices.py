# -*- coding: utf-8 -*-
import pandas as pd
import sys
sys.stdout.reconfigure(encoding='utf-8')

df = pd.read_excel(r'c:\Users\kla98\Downloads\ghfqc.xls', header=None)
print('Shape:', df.shape)
print('Columns 0-5 (A-F):')
with open(r'c:\Users\kla98\b2b-catalog\xls_dump.txt', 'w', encoding='utf-8') as f:
    for i in range(len(df)):
        row = [str(df.iloc[i, j])[:60] for j in range(6)]
        f.write(f'{i}: | {" | ".join(row)}\n')
print('Saved to xls_dump.txt')
