# Generate a new pricing csv?

* wget -O apipricing-base-payg.json https://azure.microsoft.com/api/v2/pricing/virtual-machines-base/calculator/?culture=nl-nl&discount=mosp
* wget -O apipricing-base-1y.json https://azure.microsoft.com/api/v2/pricing/virtual-machines-base-one-year/calculator/
* wget -O apipricing-base-3y.json https://azure.microsoft.com/api/v2/pricing/virtual-machines-base-three-year/calculator/
* nodejs parse.js > newpricing.csv
* mongoimport --ssl --host myhost.documents.azure.com --port myport -u myuser -p password -d mydatabase -c mydb --type csv --file newpricing.csv --headerline --upsert
