var reference = require('./referencedata.json');
var referencessd = require('./referencedata-ssd.json');
var currency = require('./currency.json');
var databricks = require('./databricks.json');
var openshift = require('./openshift.json');
var debug = false;

var pricing = {
    "payg": './apipricing-base-payg.json',
    "ri1y": './apipricing-base-1y.json',
    "ri3y": './apipricing-base-3y.json'
};

var sku = {
    "payg": './static-apipricing-base-payg.json',
    "ri1y": './static-apipricing-base-1y.json',
    "ri3y": './static-apipricing-base-3y.json'
};

console.log("name,type,contract,tier,cores,pcores,mem,region,price,ACU,SSD,MaxNics,Bandwidth,MaxDataDiskCount,MaxDataDiskSizeGB,MaxDataDiskIops,MaxDataDiskThroughputMBs,MaxVmIops,MaxVmThroughputMBs,ResourceDiskSizeInMB,TempDiskSizeInGB,TempDiskIops,TempDiskReadMBs,TempDiskWriteMBs,SAPS2T,SAPS3T,SAPHANA,SAPLI,Hyperthreaded,OfferName,_id,price_USD,price_EUR,price_GBP,price_AUD,price_JPY,price_CAD,price_DKK,price_CHF,price_SEK,price_IDR,price_INR,price_RUB,burstable,isolated,constrained,os,infiniband,gpu,sgx,sku,OpenShiftAppNodes,OpenShiftMasterNodes,dbu");

for (var pricesheet in pricing) {
    var jsonfile = require(pricing[pricesheet]);
    var offers = jsonfile.offers;
    var jsonsku = require(sku['payg']);
    var skus = jsonsku.offers;
    for (var offer in offers) {
        var cores = offers[offer].cores;
        var mem = offers[offer].ram;
        var offername = offer.split("-");
        var os = offername[0];
        var name = offername[1];
        var tier = offername[2];
        if (offername.length > 3) {
            if (offername[3] !== "v3" && offername[3] !== "v2") {
                // console.log('v1');
                os = offername[0];
                name = offername[1] + '-' + offername[2];
                tier = offername[3];
            } else {
                // console.log('v2 or v3');
                os = offername[0];
                name = offername[1] + '-' + offername[2] + '-' + offername[3];
                tier = offername[4];
            }
        } 
        var filtertier = tier;
        if (offer.indexOf("lowpriority") > -1) {
            filtertier = "standard";
        }
        if (offer.indexOf("promo") > -1) {
            //console.log("Skipping promo offer : "+offer);
        } else {
            for (var price in offers[offer].prices) {
                var region = price;
                var price = offers[offer].prices[price];
                var filter = filtertier + "_" + name;
                var lookup = reference.filter(function (value) { return value.Name === filter; });
                var picked = lookup[0];
                var pcores = cores;
                var vmid = offer + "-" + region + "-" + pricesheet;
                // Setup Pricing part for both non-ssd & SSD powered VMs
                var priceUSD = price.value;
                var priceEUR = priceUSD * currency.eur.conversion;
                var priceGBP = priceUSD * currency.gbp.conversion;
                var priceAUD = priceUSD * currency.aud.conversion;
                var priceJPY = priceUSD * currency.jpy.conversion;
                var priceCAD = priceUSD * currency.cad.conversion;
                var priceDKK = priceUSD * currency.dkk.conversion;
                var priceCHF = priceUSD * currency.chf.conversion;
                var priceSEK = priceUSD * currency.sek.conversion;
                var priceIDR = priceUSD * currency.idr.conversion;
                var priceINR = priceUSD * currency.inr.conversion;
                var priceRUB = priceUSD * currency.rub.conversion;
                // Checkup for non-ssd powered machines
                if (picked === undefined) {
                    if (debug) {
                        console.log(name + "@notfound@standard@" + pricesheet);
                    }
                } else {
                    if (picked.hasOwnProperty("BaseCpuPerformancePct")) {
                        var pcores = picked.BaseCpuPerformancePct / pcores;
                        // calculating the base performance for systems like the B-series
                    }
                    if (picked.Hyperthreaded.indexOf("Yes") > -1) {
                        var pcores = pcores * 1.3 / 2;
                        // A hyperthreaded core gains 30% compared to a single threaded. So 130% performance for two vCPU's, is an equivalent of 65% of a physical core.
                    }
                    // Burstable check
                    var burstable = "No";
                    if (picked.Burstable !== undefined) {
                        var burstable = "Yes";
                    }
                    // Infiniband check
                    var infiniband = "No";
                    if (picked.Infiniband !== undefined) {
                        infiniband = picked.Infiniband;
                    }
                    // GPU check
                    var gpu = "No";
                    if (picked.GPU !== undefined) {
                        gpu = picked.GPU;
                    }
                    // SGX check
                    var sgx = "No";
                    if (picked.SGX !== undefined) {
                        sgx = picked.SGX;
                    }
                    // Isolated check
                    var isolated = "No";
                    if (picked.Isolated !== undefined) {
                        isolated = "Yes";
                    }
                    // Constrained check
                    var constrained = "No";
                    if (picked.Constrained !== undefined) {
                        constrained = "Yes";
                        cores = picked.NumberOfCores;
                    }
                    // SAP HANA check
                    var SAPHANA = "No";
                    if (picked.HANA !== undefined) {
                        SAPHANA = picked.HANA;
                    }
                    // SAP SAPS2T check
                    var SAPS2T = "-1";
                    if (picked.SAPS2T !== undefined) {
                        SAPS2T = picked.SAPS2T;
                    }
                    // SAP SAPS3T check
                    var SAPS3T = "-1";
                    if (picked.SAPS3T !== undefined) {
                        SAPS3T = picked.SAPS3T;
                    }
                    // SAP LI check
                    var SAPLI = "No";
                    if (picked.LargeInstance !== undefined) {
                        SAPLI = picked.LargeInstance;
                    }
                    // SKU Check
                    var SKU = "Unknown";
                    try {
                        if (skus[offer] !== undefined) {
                            SKU = skus[offer].partNumbers[region].sku;
                        }
                    }
                    catch (e) {
                        SKU = "Undefined";
                    }
                    // DBU Lookup
                    var DBU = "0";
                    for (var dboffer in databricks.offers) {
                        dbuslug = databricks.offers[dboffer].vmOfferSlug;
                        if (offer === dbuslug) {
                            DBU = databricks.offers[dboffer].dbuCount;
                        }   
                    }
                    // OpenShift Lookup
                    var OpenShiftAppNodes = "No";
                    for (var openshiftoffer in openshift.applicationNodeInstances) {
                        dbuslug = openshift.applicationNodeInstances[openshiftoffer].vmOfferSlug;
                        if (offer === dbuslug) {
                            OpenShiftAppNodes = "Yes";
                        }
                    }
                    var OpenShiftMasterNodes = "No";
                    for (var openshiftoffer in openshift.masterNodesInstances) {
                        dbuslug = openshift.masterNodesInstances[openshiftoffer].vmOfferSlug;
                        if (offer === dbuslug) {
                            OpenShiftMasterNodes = "Yes";
                        }
                    }
                    // Calc storage specs (standard storage)
                    picked.MaxDataDiskSizeGB = picked.MaxDataDiskCount * 32 * 1024; // current max disk size is 32TB
                    picked.MaxDataDiskIops = picked.MaxDataDiskCount * 500; // current max disk iops is 500 for a non-premium
                    picked.MaxDataDiskThroughputMBs = picked.MaxDataDiskCount * 60; // curent max disks throughput is 60 MB/s for non-premium
                    picked.MaxVmIops = picked.MaxDataDiskIops; 
                    picked.MaxVmThroughputMBs = picked.MaxDataDiskThroughputMBs;
                    // Print output

                    if (debug === false) {
                        console.log(
                            name +
                            ",vm," +
                            pricesheet + "," +
                            tier + "," +
                            cores + "," +
                            pcores + "," +
                            mem + "," +
                            region + "," +
                            price.value + "," +
                            picked.ACU + "," +
                            picked.SSD + "," +
                            picked.MaxNics + "," +
                            picked.Bandwidth + "," +
                            picked.MaxDataDiskCount + "," +
                            picked.MaxDataDiskSizeGB + "," +
                            picked.MaxDataDiskIops + "," +
                            picked.MaxDataDiskThroughputMBs + "," +
                            picked.MaxVmIops + "," +
                            picked.MaxVmThroughputMBs + "," +
                            picked.ResourceDiskSizeInMB + "," +
                            picked.TempDiskSizeInGB + "," +
                            picked.TempDiskIops + "," +
                            picked.TempDiskReadMBs + "," +
                            picked.TempDiskWriteMBs + "," +
                            SAPS2T + "," +
                            SAPS3T + "," +
                            SAPHANA + "," +
                            SAPLI + "," +
                            picked.Hyperthreaded + "," +
                            offer + "," +
                            vmid + "," +
                            priceUSD + "," +
                            priceEUR + "," +
                            priceGBP + "," +
                            priceAUD + "," +
                            priceJPY + "," +
                            priceCAD + "," +
                            priceDKK + "," +
                            priceCHF + "," +
                            priceSEK + "," +
                            priceIDR + "," +
                            priceINR + "," +
                            priceRUB + "," +
                            burstable + "," +
                            isolated + "," +
                            constrained + "," +
                            os + "," +
                            infiniband + "," +
                            gpu + "," +
                            sgx + "," +
                            SKU + "," +
                            OpenShiftAppNodes + "," +
                            OpenShiftMasterNodes + "," +
                            DBU
                        );
                    } else {
                        console.log(name + "@found@standard@" + pricesheet);
                    }
                } 
                // Checkup for SSD Powered (or other variants, like Isolated) Machines that leverage the same pricing SKU
                var output = referencessd.filter(function (x) { return x.Link === filter; });
                if (Object.keys(output).length) {
                    for (var variant in output) {
                        var picked = output[variant];
                        var ssdname = picked.Name.split("_");
                        var pickedname = ssdname[1];
                        var pickedoffer = os + "-" + pickedname + "-" + tier;
                        var vmid = pickedoffer + "-" + region + "-" + pricesheet;
                        if (picked.hasOwnProperty("BaseCpuPerformancePct")) {
                            var pcores = picked.BaseCpuPerformancePct / pcores;
                            // calculating the base performance for systems like the B-series
                        }
                        if (picked.Hyperthreaded.indexOf("Yes") > -1) {
                            var pcores = pcores * 1.3 / 2;
                            // A hyperthreaded core gains 30% compared to a single threaded. So 130% performance for two vCPU's, is an equivalent of 65% of a physical core.
                        }
                        // Burstable check
                        var burstable = "No";
                        if (picked.Burstable !== undefined) {
                            var burstable = "Yes";
                        }
                        // GPU check
                        var gpu = "No";
                        if (picked.GPU !== undefined) {
                            gpu = picked.GPU;
                        }
                        // Infiniband check
                        var infiniband = "No";
                        if (picked.Infiniband !== undefined) {
                            infiniband = picked.Infiniband;
                        }
                        // SGX check
                        var sgx = "No";
                        if (picked.SGX !== undefined) {
                            sgx = picked.SGX;
                        }
                        // Isolated check
                        var isolated = "No";
                        if (picked.Isolated !== undefined) {
                            isolated = "Yes";
                        }
                        // Constrained check
                        var constrained = "No";
                        if (picked.Constrained !== undefined) {
                            constrained = "Yes";
                        }
                        // SAP HANA check
                        var SAPHANA = "No";
                        if (picked.HANA !== undefined) {
                            SAPHANA = picked.HANA;
                        }
                        // SAP SAPS2T check
                        var SAPS2T = "-1";
                        if (picked.SAPS2T !== undefined) {
                            SAPS2T = picked.SAPS2T;
                        }
                        // SAP SAPS3T check
                        var SAPS3T = "-1";
                        if (picked.SAPS3T !== undefined) {
                            SAPS3T = picked.SAPS3T;
                        }
                        // SAP LI check
                        var SAPLI = "No";
                        if (picked.LargeInstance !== undefined) {
                            SAPLI = picked.LargeInstance;
                        }
                        // SKU Check
                        var SKU = "Unknown";
                        try {
                            if (skus[offer] !== undefined) {
                                SKU = skus[offer].partNumbers[region].sku;
                            }
                        }
                        catch (e) {
                            SKU = "Undefined";
                        }
                        // DBU Lookup
                        var DBU = "0";
                        for (var dboffer in databricks.offers) {
                            dbuslug = databricks.offers[dboffer].vmOfferSlug;
                            if (offer === dbuslug) {
                                DBU = databricks.offers[dboffer].dbuCount;
                            }
                        }
                        // OpenShift Lookup
                        var OpenShiftAppNodes = "No";
                        for (var openshiftoffer in openshift.applicationNodeInstances) {
                            dbuslug = openshift.applicationNodeInstances[openshiftoffer].vmOfferSlug;
                            if (offer === dbuslug) {
                                OpenShiftAppNodes = "Yes";
                            }
                        }
                        var OpenShiftMasterNodes = "No";
                        for (var openshiftoffer in openshift.masterNodesInstances) {
                            dbuslug = openshift.masterNodesInstances[openshiftoffer].vmOfferSlug;
                            if (offer === dbuslug) {
                                OpenShiftMasterNodes = "Yes";
                            }
                        }
                        // Calc max disk size for VM
                        picked.MaxDataDiskSizeGB = picked.MaxDataDiskCount * 32 * 1024; // current max disk size is 32TB
                        // Print output
                        if (debug === false) {
                            console.log(
                                pickedname +
                                ",vm," +
                                pricesheet + "," +
                                tier + "," +
                                cores + "," +
                                pcores + "," +
                                mem + "," +
                                region + "," +
                                price.value + "," +
                                picked.ACU + "," +
                                picked.SSD + "," +
                                picked.MaxNics + "," +
                                picked.Bandwidth + "," +
                                picked.MaxDataDiskCount + "," +
                                picked.MaxDataDiskSizeGB + "," +
                                picked.MaxDataDiskIops + "," +
                                picked.MaxDataDiskThroughputMBs + "," +
                                picked.MaxVmIops + "," +
                                picked.MaxVmThroughputMBs + "," +
                                picked.ResourceDiskSizeInMB + "," +
                                picked.TempDiskSizeInGB + "," +
                                picked.TempDiskIops + "," +
                                picked.TempDiskReadMBs + "," +
                                picked.TempDiskWriteMBs + "," +
                                SAPS2T + "," +
                                SAPS3T + "," +
                                SAPHANA + "," +
                                SAPLI + "," +
                                picked.Hyperthreaded + "," +
                                pickedoffer + "," +
                                vmid + "," +
                                priceUSD + "," +
                                priceEUR + "," +
                                priceGBP + "," +
                                priceAUD + "," +
                                priceJPY + "," +
                                priceCAD + "," +
                                priceDKK + "," +
                                priceCHF + "," +
                                priceSEK + "," +
                                priceIDR + "," +
                                priceINR + "," +
                                priceRUB + "," +
                                burstable + "," +
                                isolated + "," +
                                constrained + "," +
                                os + "," +
                                infiniband + "," +
                                gpu + "," +
                                sgx + "," +
                                SKU + "," +
                                OpenShiftAppNodes + "," +
                                OpenShiftMasterNodes + "," +
                                DBU
                            );
                        } else {
                            console.log(name + "@found@premium@" + pricesheet);
                        }
                    }
                } else {
                    if (debug) {
                        console.log(name + "@notfound@premium@" + pricesheet);
                    }
                }
            }
        }
    }
    // }
}