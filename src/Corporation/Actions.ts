import { ICorporation } from "./ICorporation";
import { IIndustry } from "./IIndustry";
import { IndustryStartingCosts, IndustryResearchTrees } from "./IndustryData";
import { Industry } from "./Industry";
import { CorporationConstants } from "./data/Constants";
import { OfficeSpace } from "./OfficeSpace";
import { Material } from "./Material";
import { Product } from "./Product";
import { Warehouse } from "./Warehouse";
import { CorporationUnlockUpgrade } from "./data/CorporationUnlockUpgrades";
import { CorporationUpgrade } from "./data/CorporationUpgrades";
import { Cities } from "../Locations/Cities";
import { EmployeePositions } from "./EmployeePositions";
import { Employee } from "./Employee";
import { IndustryUpgrades } from "./IndustryUpgrades";
import { ResearchMap } from "./ResearchMap";
import { MaterialSizes } from "src/Corporation/MaterialSizes.js";

export function NewIndustry(corporation: ICorporation, industry: string, name: string): string | null {
  for (let i = 0; i < corporation.divisions.length; ++i) {
    if (corporation.divisions[i].name === name) {
      return "This division name is already in use!";
    }
  }

  const cost = IndustryStartingCosts[industry];
  if (cost === undefined) {
    return `Invalid industry: '${industry}'`;
  }
  if (corporation.funds < cost) {
    return "Not enough money to create a new division in this industry";
  } else if (name === "") {
    return "New division must have a name!";
  } else {
    corporation.funds = corporation.funds - cost;
    corporation.divisions.push(
      new Industry({
        corp: corporation,
        name: name,
        type: industry,
      }),
    );
  }

  return null;
}

export function NewCity(corporation: ICorporation, division: IIndustry, city: string): boolean {
  if (!CorporationConstants.Cities.includes(city)) throw new Error("Invalid city name");

  if (corporation.funds < CorporationConstants.OfficeInitialCost) {
    return false;
  } else {
    corporation.funds = corporation.funds - CorporationConstants.OfficeInitialCost;
    division.offices[city] = new OfficeSpace({
      loc: city,
      size: CorporationConstants.OfficeInitialSize,
    });
    return true;
  }
}

export function UnlockUpgrade(corporation: ICorporation, upgrade: CorporationUnlockUpgrade): boolean {
  if (corporation.funds < upgrade[1]) {
    return false;
  }
  corporation.unlock(upgrade);
  return true;
}

export function LevelUpgrade(corporation: ICorporation, upgrade: CorporationUpgrade): boolean {
  const baseCost = upgrade[1];
  const priceMult = upgrade[2];
  const level = corporation.upgrades[upgrade[0]];
  const cost = baseCost * Math.pow(priceMult, level);
  if (corporation.funds < cost) {
    return false;
  }
  
  corporation.upgrade(upgrade);
  return true
}

export function IssueDividends(corporation: ICorporation, percent: number): void {
  if (isNaN(percent) || percent < 0 || percent > CorporationConstants.DividendMaxPercentage) {
    throw new Error(`Invalid value. Must be an integer between 0 and ${CorporationConstants.DividendMaxPercentage}`);
  }

  corporation.dividendPercentage = percent * 100;
}

export function SellMaterial(mat: Material, amt: string, price: string): void {
  if (price === "") price = "0";
  if (amt === "") amt = "0";
  let cost = price.replace(/\s+/g, "");
  cost = cost.replace(/[^-()\d/*+.MPe]/g, ""); //Sanitize cost
  let temp = cost.replace(/MP/g, mat.bCost + "");
  try {
    temp = eval(temp);
  } catch (e) {
    throw new Error("Invalid value or expression for sell price field: " + e);
  }

  if (temp == null || isNaN(parseFloat(temp)) || parseFloat(temp) < 0) {
    throw new Error("Invalid value or expression for sell price field");
  }

  if (cost.includes("MP")) {
    mat.sCost = cost; //Dynamically evaluated
  } else {
    mat.sCost = temp;
  }

  //Parse quantity
  amt = amt.toUpperCase();
  if (amt.includes("MAX") || amt.includes("PROD")) {
    let q = amt.replace(/\s+/g, "");
    q = q.replace(/[^-()\d/*+.MAXPROD]/g, "");
    let tempQty = q.replace(/MAX/g, "1");
    tempQty = tempQty.replace(/PROD/g, "1");
    try {
      tempQty = eval(tempQty);
    } catch (e) {
      throw new Error("Invalid value or expression for sell price field: " + e);
    }

    if (tempQty == null || isNaN(parseFloat(tempQty)) || parseFloat(tempQty) < 0) {
      throw new Error("Invalid value or expression for sell price field");
    }

    mat.sllman[0] = true;
    mat.sllman[1] = q; //Use sanitized input
  } else if (isNaN(parseFloat(amt)) || parseFloat(amt) < 0) {
    throw new Error("Invalid value for sell quantity field! Must be numeric or 'MAX'");
  } else {
    let q = parseFloat(amt);
    if (isNaN(q)) {
      q = 0;
    }
    if (q === 0) {
      mat.sllman[0] = false;
      mat.sllman[1] = 0;
    } else {
      mat.sllman[0] = true;
      mat.sllman[1] = q;
    }
  }
}

export function SellProduct(product: Product, city: string, amt: string, price: string, all: boolean): void {
  //Parse price
  if (price.includes("MP")) {
    //Dynamically evaluated quantity. First test to make sure its valid
    //Sanitize input, then replace dynamic variables with arbitrary numbers
    price = price.replace(/\s+/g, "");
    price = price.replace(/[^-()\d/*+.MP]/g, "");
    let temp = price.replace(/MP/g, "1");
    try {
      temp = eval(temp);
    } catch (e) {
      throw new Error("Invalid value or expression for sell quantity field: " + e);
    }
    if (temp == null || isNaN(parseFloat(temp)) || parseFloat(temp) < 0) {
      throw new Error("Invalid value or expression for sell quantity field.");
    }
    product.sCost = price; //Use sanitized price
  } else {
    const cost = parseFloat(price);
    if (isNaN(cost)) {
      throw new Error("Invalid value for sell price field");
    }
    product.sCost = cost;
  }

  // Array of all cities. Used later
  const cities = Object.keys(Cities);

  // Parse quantity
  amt = amt.toUpperCase();
  if (amt.includes("MAX") || amt.includes("PROD")) {
    //Dynamically evaluated quantity. First test to make sure its valid
    let qty = amt.replace(/\s+/g, "");
    qty = qty.replace(/[^-()\d/*+.MAXPROD]/g, "");
    let temp = qty.replace(/MAX/g, "1");
    temp = temp.replace(/PROD/g, "1");
    try {
      temp = eval(temp);
    } catch (e) {
      throw new Error("Invalid value or expression for sell price field: " + e);
    }

    if (temp == null || isNaN(parseFloat(temp)) || parseFloat(temp) < 0) {
      throw new Error("Invalid value or expression for sell price field");
    }
    if (all) {
      for (let i = 0; i < cities.length; ++i) {
        const tempCity = cities[i];
        product.sllman[tempCity][0] = true;
        product.sllman[tempCity][1] = qty; //Use sanitized input
      }
    } else {
      product.sllman[city][0] = true;
      product.sllman[city][1] = qty; //Use sanitized input
    }
  } else if (isNaN(parseFloat(amt)) || parseFloat(amt) < 0) {
    throw new Error("Invalid value for sell quantity field! Must be numeric");
  } else {
    let qty = parseFloat(amt);
    if (isNaN(qty)) {
      qty = 0;
    }
    if (qty === 0) {
      if (all) {
        for (let i = 0; i < cities.length; ++i) {
          const tempCity = cities[i];
          product.sllman[tempCity][0] = false;
          product.sllman[tempCity][1] = "";
        }
      } else {
        product.sllman[city][0] = false;
        product.sllman[city][1] = "";
      }
    } else {
      if (all) {
        for (let i = 0; i < cities.length; ++i) {
          const tempCity = cities[i];
          product.sllman[tempCity][0] = true;
          product.sllman[tempCity][1] = qty;
        }
      } else {
        product.sllman[city][0] = true;
        product.sllman[city][1] = qty;
      }
    }
  }
}

export function SetSmartSupply(warehouse: Warehouse, smartSupply: boolean): void {
  warehouse.smartSupplyEnabled = smartSupply;
}

export function SetSmartSupplyUseLeftovers(warehouse: Warehouse, material: Material, useLeftover: boolean): void {
  if (!Object.keys(warehouse.smartSupplyUseLeftovers).includes(material.name.replace(/ /g, "")))
    throw new Error(`Invalid material '${material.name}'`);
  warehouse.smartSupplyUseLeftovers[material.name.replace(/ /g, "")] = useLeftover;
}

export function BuyMaterial(material: Material, amt: number): void {
  if (isNaN(amt) || amt < 0) {
    throw new Error(`Invalid amount '${amt}' to buy material '${material.name}'`);
  }
  material.buy = amt;
}

export function BulkPurchaseMaterial(material: Material, amt: number): void {
  if (isNaN(amt) || amt < 0) {
    throw new Error(`Invalid amount '${amt}' to bulk buy material '${material.name}'`);
  }
  material.buyBulk = amt;
}

export function AssignJob(employee: Employee, job: string): void {
  if (!Object.values(EmployeePositions).includes(job)) throw new Error(`'${job}' is not a valid job.`);
  employee.pos = job;
}

export function UpgradeOfficeSize(corp: ICorporation, office: OfficeSpace, size: number): boolean {
  const initialPriceMult = Math.round(office.size / CorporationConstants.OfficeInitialSize);
  const costMultiplier = 1.09;
  // Calculate cost to upgrade size by 15 employees
  let mult = 0;
  for (let i = 0; i < size / CorporationConstants.OfficeInitialSize; ++i) {
    mult += Math.pow(costMultiplier, initialPriceMult + i);
  }
  const cost = CorporationConstants.OfficeInitialCost * mult;
  if (corp.funds < cost) return false;
  office.size += size;
  corp.funds = corp.funds - cost;
  return true;
}

export function ThrowParty(corp: ICorporation, office: OfficeSpace, costPerEmployee: number): number {
  const totalCost = costPerEmployee * office.employees.length;
  if (corp.funds < totalCost) return 0;
  corp.funds = corp.funds - totalCost;
  let mult = 0;
  for (let i = 0; i < office.employees.length; ++i) {
    mult = office.employees[i].throwParty(costPerEmployee);
  }

  return mult;
}

export function PurchaseWarehouse(corp: ICorporation, division: IIndustry, city: string): boolean {
  if (corp.funds < CorporationConstants.WarehouseInitialCost) return false;
  if (division.warehouses[city] instanceof Warehouse) return false;
  division.warehouses[city] = new Warehouse({
    corp: corp,
    industry: division,
    loc: city,
    size: CorporationConstants.WarehouseInitialSize,
  });
  corp.funds = corp.funds - CorporationConstants.WarehouseInitialCost;
  return true;
}

export function UpgradeWarehouse(corp: ICorporation, division: IIndustry, warehouse: Warehouse): boolean {
  const sizeUpgradeCost = CorporationConstants.WarehouseUpgradeBaseCost * Math.pow(1.07, warehouse.level + 1);
  if (corp.funds < sizeUpgradeCost) return false;
  ++warehouse.level;
  warehouse.updateSize(corp, division);
  corp.funds = corp.funds - sizeUpgradeCost;
  return true;
}

export function BuyCoffee(corp: ICorporation, division: IIndustry, office: OfficeSpace): void {
  const upgrade = IndustryUpgrades[0];
  const cost = office.employees.length * upgrade[1];
  if (corp.funds < cost) return;
  corp.funds = corp.funds - cost;
  division.upgrade(upgrade, {
    corporation: corp,
    office: office,
  });
}

export function HireAdVert(corp: ICorporation, division: IIndustry, office: OfficeSpace): boolean {
  const upgrade = IndustryUpgrades[1];
  const cost = upgrade[1] * Math.pow(upgrade[2], division.upgrades[1]);
  if (corp.funds < cost) return false;
  corp.funds = corp.funds - cost;
  division.upgrade(upgrade, {
    corporation: corp,
    office: office,
  });
  return true
}

export function MakeProduct(
  corp: ICorporation,
  division: IIndustry,
  city: string,
  productName: string,
  designInvest: number,
  marketingInvest: number,
): void {
  if (designInvest < 0) {
    designInvest = 0;
  }
  if (marketingInvest < 0) {
    marketingInvest = 0;
  }
  if (productName == null || productName === "") {
    throw new Error("You must specify a name for your product!");
  }
  if (isNaN(designInvest)) {
    throw new Error("Invalid value for design investment");
  }
  if (isNaN(marketingInvest)) {
    throw new Error("Invalid value for marketing investment");
  }
  if (corp.funds < designInvest + marketingInvest) {
    throw new Error("You don't have enough company funds to make this large of an investment");
  }
  const product = new Product({
    name: productName.replace(/[<>]/g, ""), //Sanitize for HTMl elements
    createCity: city,
    designCost: designInvest,
    advCost: marketingInvest,
  });
  if (division.products[product.name] instanceof Product) {
    throw new Error(`You already have a product with this name!`);
  }
  corp.funds = corp.funds - (designInvest + marketingInvest);
  division.products[product.name] = product;
}

export function Research(division: IIndustry, researchName: string): boolean {
  const researchTree = IndustryResearchTrees[division.type];
  if (researchTree === undefined) throw new Error(`No research tree for industry '${division.type}'`);
  const allResearch = researchTree.getAllNodes();
  if (!allResearch.includes(researchName)) throw new Error(`No research named '${researchName}'`);
  const research = ResearchMap[researchName];

  if (division.hasResearch(researchName)) return true;
  if (division.sciResearch.qty < research.cost) return false;

  division.sciResearch.qty -= research.cost;

  // Get the Node from the Research Tree and set its 'researched' property
  researchTree.research(researchName);
  division.researched[researchName] = true;
  return true;
}

export function ExportMaterial(divisionName: string, cityName: string, material: Material, amt: string): void {
  // Sanitize amt
  let sanitizedAmt = amt.replace(/\s+/g, "").toUpperCase();
  sanitizedAmt = sanitizedAmt.replace(/[^-()\d/*+.MAX]/g, "");
  let temp = sanitizedAmt.replace(/MAX/g, "1");
  try {
    temp = eval(temp);
  } catch (e) {
    throw new Error("Invalid expression entered for export amount: " + e);
  }

  const n = parseFloat(temp);

  if (n == null || isNaN(n) || n < 0) {
    throw new Error("Invalid amount entered for export");
  }
  const exportObj = { ind: divisionName, city: cityName, amt: sanitizedAmt };
  material.exp.push(exportObj);
}

export function CancelExportMaterial(divisionName: string, cityName: string, material: Material, amt: string): void {
  for (let i = 0; i < material.exp.length; ++i) {
    if (material.exp[i].ind !== divisionName || material.exp[i].city !== cityName || material.exp[i].amt !== amt)
      continue;
    material.exp.splice(i, 1);
    break;
  }
}

export function LimitProductProduction(product: Product, cityName: string, qty: number): void {
  if (qty < 0 || isNaN(qty)) {
    product.prdman[cityName][0] = false;
  } else {
    product.prdman[cityName][0] = true;
    product.prdman[cityName][1] = qty;
  }
}

export function SetMaterialMarketTA1(material: Material, on: boolean): void {
  material.marketTa1 = on;
}

export function SetMaterialMarketTA2(material: Material, on: boolean): void {
  material.marketTa2 = on;
}

export function SetProductMarketTA1(product: Product, on: boolean): void {
  product.marketTa1 = on;
}

export function SetProductMarketTA2(product: Product, on: boolean): void {
  product.marketTa2 = on;
}
