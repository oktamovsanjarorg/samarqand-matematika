"""T-165: .xls sinov fayllari mustaqil kutubxona (xlwt 1.3.0) bilan yaratiladi, o'quvchimiz o'zi yozgan fayl bilan sinalmaydi.
Qayta yaratish: python3 -m venv v && v/bin/pip install xlwt==1.3.0 && v/bin/python make-xls.py"""
import xlwt

wb = xlwt.Workbook(encoding="utf-8")
ws = wb.add_sheet("Natijalar")
rows = [
    ["F.I.O", "Telefon", "Algebra", "Geometriya", "Izoh"],
    ["Oʻktam Gʻaniyev", "998901112233", 12, 7.5, "a&b <c> \"d\""],
    ["Ali", None, -3, 0.1, None],
    ["Vali", "", 1000000, 123456789.25, "1;2,3"],
]
for r, row in enumerate(rows):
    for c, v in enumerate(row):
        if v is not None:
            ws.write(r, c, v)
wb.add_sheet("Ikkinchi").write(0, 0, "bu varaq oʻqilmaydi")
wb.save("offline.xls")

# Katta umumiy satrlar jadvali (SST CONTINUE yozuvlariga bo'linadi)
wb = xlwt.Workbook(encoding="utf-8")
ws = wb.add_sheet("Katta")
for i in range(600):
    ws.write(i, 0, f"Oʻquvchi {i} " + "x" * (i % 40))
    ws.write(i, 1, i)
wb.save("big.xls")

# Brauzer testi uchun (e2e/fixtures/offline-results.xls): ism va Q1..Q4 (1 to'g'ri, 0 xato, bo'sh)
wb = xlwt.Workbook(encoding="utf-8")
ws = wb.add_sheet("Natijalar")
for r, row in enumerate([["F.I.O", "Q1", "Q2", "Q3", "Q4"], ["Xls Sinovchi Bir", 1, 1, 0, 1], ["Xls Sinovchi Ikki", 0, None, 1, 0]]):
    for c, v in enumerate(row):
        if v is not None:
            ws.write(r, c, v)
wb.save("../../../../../e2e/fixtures/offline-results.xls")
