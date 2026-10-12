#!/usr/bin/env python3
"""Export reviewed Western Visayas dashboard snapshots from the local SQLite database."""

from __future__ import annotations

import argparse
import csv
import sqlite3
from collections import defaultdict
from pathlib import Path


def write_commodity(db, output, name, choose):
    selected = defaultdict(dict)
    years = set()
    for row in db.execute("""SELECT s.filename,o.commodity,o.geography_level,o.geography,o.year,
                                    o.period_type,o.period_number,o.value
                             FROM openstat_observation o JOIN source_file s ON s.id=o.source_id
                             WHERE o.geography_level IN ('region','province')
                               AND o.period_type IN ('annual','quarter')"""):
        filename, commodity, level, geography, year, period_type, period_number, value = row
        mapped = choose(filename, commodity, level, year)
        if mapped is None:
            continue
        key = (mapped, geography, level)
        selected[key][(year, period_type, period_number)] = value
        years.add(year)
    years = sorted(years)
    columns = [(year, period_type, period_number) for year in years
               for period_type, period_number in (("annual", None), ("quarter", 1), ("quarter", 2), ("quarter", 3), ("quarter", 4))]
    with (output / f"{name}.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["commodity", "name", "level", *[str(year) for year, _, _ in columns]])
        writer.writerow(["", "", "", *[("Annual" if kind == "annual" else f"Quarter {number}") for _, kind, number in columns]])
        for (commodity, geography, level), values in sorted(selected.items()):
            writer.writerow([commodity, geography, level, *["" if values.get(column) is None else values[column] for column in columns]])
    print(name, len(selected), "rows", f"{years[0]}–{years[-1]}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=Path("data/agristat.sqlite"))
    parser.add_argument("--output", type=Path, default=Path("web/public/data"))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.database)

    write_commodity(db, args.output, "crops", lambda f, c, _l, _y: c if f == "rice_corn_volume.csv" else None)
    write_commodity(db, args.output, "area", lambda f, c, _l, _y: c if f == "rice_corn_area_harvested.csv" else None)
    write_commodity(db, args.output, "livestock", lambda f, c, l, y:
                    c if (f == "livestock_volume.csv" and y <= 2022 and l == "region") or f == "livestock_volume2.csv" else None)

    def poultry(filename, commodity, level, year):
        if filename == "poultry_volume.csv" and level == "region":
            return commodity if commodity != "Chicken" or year <= 2022 else None
        if filename == "chicken_volume.csv":
            return "Chicken" if commodity == "CHICKEN" else commodity
        return None

    write_commodity(db, args.output, "poultry", poultry)
    write_commodity(db, args.output, "fruit", lambda f, c, _l, _y: c if f == "mango_banana_volume.csv" else None)
    write_commodity(db, args.output, "fruit_area", lambda f, c, _l, _y: c if f == "mango_banana_area_planted.csv" else None)
    write_commodity(db, args.output, "fruit_trees", lambda f, c, _l, _y: c if f == "mango_banana_no_trees.csv" else None)
    write_commodity(db, args.output, "vegetables", lambda f, c, _l, _y: c if f == "vegetables_root_crops_volume.csv" else None)
    write_commodity(db, args.output, "vegetables_area", lambda f, c, _l, _y: c if f == "vegetables_root_crops_area.csv" else None)
    write_commodity(db, args.output, "major", lambda f, c, _l, _y:
                    c if f == "major_crops_volume.csv" and not c.startswith(("Banana", "Mango")) else None)

    with (args.output / "rsbsa_profiles.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["level", "province", "district", "municipality", "category", "male", "female", "total", "average_age", "senior", "ip", "pwd", "four_ps", "arb", "source_row"])
        for row in db.execute("""SELECT g.level,g.province,g.district,g.municipality,p.category,
                                        p.male,p.female,p.total,p.average_age,p.senior,
                                        CASE WHEN g.level='municipality' THEN NULL ELSE p.ip END,
                                        CASE WHEN g.level='municipality' THEN NULL ELSE p.pwd END,
                                        CASE WHEN g.level='municipality' THEN NULL ELSE p.four_ps END,
                                        CASE WHEN g.level='municipality' THEN NULL ELSE p.arb END,g.source_row
                                 FROM rsbsa_geography g JOIN rsbsa_profile p ON p.geography_id=g.id
                                 ORDER BY g.source_row,p.category"""):
            writer.writerow(["" if value is None else value for value in row])

    with (args.output / "rsbsa_areas.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["level", "province", "district", "municipality", "measure", "value", "unit", "source_row"])
        for row in db.execute("""SELECT g.level,g.province,g.district,g.municipality,a.measure,a.value,a.unit,g.source_row
                                 FROM rsbsa_geography g JOIN rsbsa_area a ON a.geography_id=g.id
                                 ORDER BY g.source_row,a.measure"""):
            writer.writerow(["" if value is None else value for value in row])

    db.close()


if __name__ == "__main__":
    main()
