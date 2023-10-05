import csv, sys, json


jsonFile = sys.argv[1]


with open(jsonFile) as j:
  data = json.load(j)
  output = f'{jsonFile.split(".")[0]}.csv'
  with open(output, 'w+', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['user', 'number', 'state', 'gfi', 'gfiRange'])

    for pr in data:
      writer.writerow([pr['user'], pr['number'], pr['state'], 1 if pr['gfi'] else 0, 1 if pr['gfiRange'] else 0])

    # close the file
    f.close()