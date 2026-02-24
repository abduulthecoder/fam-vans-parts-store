import json
from pathlib import Path

input_path = Path(__file__).resolve().parent.parent / 'Models' / 'inventory.json'
output_path = Path(__file__).resolve().parent.parent / 'Models' / 'vans.json'

numeric_keys = {'fam_cost', 'retail_price', 'labor_hours', 'job_price'}


def try_number(value):
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        s = value.strip()
        if s == '':
            return 0
        # remove common thousands separators
        s_clean = s.replace(',', '')
        try:
            if '.' in s_clean:
                return float(s_clean)
            return int(s_clean)
        except Exception:
            return value
    return value


def sanitize(obj):
    if isinstance(obj, dict):
        for k, v in list(obj.items()):
            if k in numeric_keys:
                obj[k] = try_number(v)
            else:
                sanitize(v)
    elif isinstance(obj, list):
        for item in obj:
            sanitize(item)


if __name__ == '__main__':
    data = json.loads(input_path.read_text(encoding='utf-8'))
    sanitize(data)
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'Wrote sanitized file to: {output_path}')
