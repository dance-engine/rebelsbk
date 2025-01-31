import { PartialSelectedOptions, Pass, Passes } from './pricingTypes'
// import { individualTickets, passes, fullPassName} from './pricingDefaults'
// import { individualTickets, passes, fullPassName} from './pricingDefaults'
import power from 'power-set'
import isubsetof from 'set.prototype.issubsetof'
import { individualTickets } from './pricingDefaultsDynamic';
isubsetof.shim();

// Returns a list of all pass combinations you could buy
const generateAllPassCombinations = (passes,fullPassName = 'None') => {
  console.log("generateAllPassCombinations")
  console.log("passes",passes)
  const passTitles = Object.keys(passes).filter((item) => { return item != fullPassName && passes[item].isAvailable })
  const passCombinations = power(passTitles)
  console.log(passCombinations)
  // passCombinations.forEach((passCombination: any[]) => {
  //   const packagePrice = priceForPassCombination(passCombination,priceModel)
  //   const tickePrice = priceForIndividualItems(itemsNotCovered(optionsToPassArray(selectedOptions),itemsFromPassCombination(passCombination)))
  //   const combinedPrice = packagePrice + tickePrice
  //   // const passCombination = Array.from(passCombinations.values())[0]
  //   console.log(`${passCombination.join(' / ')} , £${packagePrice} + £${tickePrice} = £${combinedPrice}
  //     - provides    (${itemsFromPassCombination(passCombination).join(',')})
  //     - wanted      (${optionsToPassArray(selectedOptions)})
  //     - individuals (${itemsNotCovered(optionsToPassArray(selectedOptions),itemsFromPassCombination(passCombination))})
  //     `
  //   )
  // })
  // console.log('---PassCombination Generated---')
  // return [[],...passCombinations, [fullPassName]]
  return [[],...passCombinations]
}

// This function takes a PartialSelectedOptions and returns it's cost for the given pricemodel to buy everything normla price
const calculateTotalCost = (evaluatedOptions,priceModel,individualTickets) => {
  let total = 0;
  if(['cost','studentCost'].includes(priceModel)) {
    Object.keys(evaluatedOptions).forEach((day) => {
      Object.keys(evaluatedOptions[day]).forEach((passType) => {
        if (evaluatedOptions[day][passType]) {
          // total += individualTickets && individualTickets[day] && individualTickets[day][passType]? individualTickets[day][passType][priceModel] : 0
          total += individualTickets && individualTickets[day] && individualTickets[day][passType]? individualTickets[day][passType].cost : 0
          // console.log(day,passType,priceModel, individualTickets)
        }
      })
    })  
  }
  return total
}

// Basic check to see if a thing is a pass or a ticket
const passOrTicket = (itemName,passes) => {
  return Object.keys(passes).includes(itemName)? "" : "Ticket"
}

// This takes a PartialSelectedOptions and truns it into an array of individual tickets 
const optionsToPassArray = (options:PartialSelectedOptions) => { // max 2 level
  const keys = Object.keys(options)
  return keys.flatMap((key) => {
    return Object.keys(options[key]).map((subkey) => {
      return options[key][subkey] && (options[key][subkey] === true || options[key][subkey].isAvailable) ? `${key} ${subkey}` : null
    })
  }).filter(Boolean)
}
// Return the available tickets for a speciufic day
const availableOptionsForDay = (day:string,individualTickets:any) => {
  return Object.keys(individualTickets[day]).filter((key)=>{ return individualTickets[day][key].isAvailable})
}
// 
const isAllDayOptions = (options: PartialSelectedOptions,day:string,individualTickets:any) => {
  const daySelection = new Set(Object.keys(options[day]).filter((key) => options[day][key]))
  const allSelections = new Set(availableOptionsForDay(day,individualTickets))
  return daySelection.symmetricDifference(allSelections).size == 0
}
const availableDaysForOption = (option: string) => {
  return Object.keys(individualTickets).map((day) => {
    const options = availableOptionsForDay(day,individualTickets)
    return options.includes(option) ? day : null
  }).filter(Boolean)
}
const isAllPassOptions = (options: PartialSelectedOptions,passType:string) => {
  const relevantDays = availableDaysForOption(passType)
  return relevantDays.map((day) => {
    return options[day][passType]
  }).every(Boolean)
}
const priceForPassCombination = (passCombination,priceModel,passes) => {
  const price = passCombination.reduce((price ,passTitle) => {
    console.log("priceForPassCombination")
    console.log(passes, passTitle,passes[passTitle])
    return price + passes[passTitle][priceModel]
  },0)
  return price
}
const itemsFromPassCombination = (passCombination,fromPasses) :string[] => {
  // console.log("passCombination",passCombination)
  const items = passCombination.reduce((items ,passTitle) => {
    fromPasses && fromPasses[passTitle] && fromPasses[passTitle].combination.forEach((item) => items.add(item))
    return items
  },new Set)
  // console.log("Item founds", items)
  return Array.from(items.values())
}
const priceForIndividualItems = (items: any[], individualTickets: any[]) => {
  
  const price = items.reduce((price ,itemKey) => {
    const [day,passType] = itemKey.split(' ')
    return individualTickets && individualTickets[day] && individualTickets[day][passType] ? price + individualTickets[day][passType] : price + 0
  },0)
  return price
}

export const itemListToOptions = (items: string[], setTo:boolean, individualTickets: any[]) => {
  return items.reduce((returnOptions,item) => {
    const [day,passType] = item.split(' ')
    const isAvailable = individualTickets && individualTickets[day] && individualTickets[day][passType] && individualTickets[day][passType].active
    // console.log("day",day,"passType",passType, "setTo", setTo, "isAvailable", isAvailable)
    // console.log("individualTickets",individualTickets)
    returnOptions = {...returnOptions,[day]: {...returnOptions[day], [passType]: isAvailable ? setTo : false}}
    return returnOptions
  },{})
}

export const addToOptions = (currentOptions: PartialSelectedOptions,options: PartialSelectedOptions) => {
  // console.log("Adding ",options, " to ", currentOptions)
  // console.log("Object.keys(currentOptions)",Object.keys(currentOptions))
  const returnOptions =  Object.keys(currentOptions).reduce((returnOptions,day) => {
    returnOptions = {...returnOptions,[day]: {...currentOptions[day], ...returnOptions[day], ...options[day]}}
    return returnOptions
  },{})
  // console.log("returnOptions",returnOptions)
  return returnOptions
}
const itemsNotCovered = (optionsRequested,optionsCovered) => {
  const requested = new Set(optionsRequested) 
  // console.log("Requested",requested,optionsRequested)
  const covered = new Set(optionsCovered)
  // console.log("Covered",requested,optionsCovered)
  // console.log("Difference",requested.difference(covered))
  return Array.from(requested.difference(covered).values())
}
const getBestCombination = (options,priceModel, individualTickets: any[],passes: Passes) => {
  console.log("BEST COMBO!!!!!")
  console.log(options)
  console.log(priceModel)
  console.log(individualTickets)
  console.log(passes)
  // console.log("")
  if(optionsToPassArray(options).length == 0) {
    return {price: 0, options: []}
  }
  const passCombinations = generateAllPassCombinations(passes)
  console.log("Pass combos", passCombinations,passes)
  let bestOptions = []
  let bestPrice = 9999.00
  passCombinations.forEach((passCombination: any[]) => {
    // console.log("passCombination,priceModel",passCombination,priceModel)
    const packagePrice = priceForPassCombination(passCombination,priceModel,passes)
    console.log(" - packagePrice", packagePrice)
    const tickePrice = priceForIndividualItems(itemsNotCovered(optionsToPassArray(options),itemsFromPassCombination(passCombination,passes)),individualTickets)
    console.log(" - tickePrice", tickePrice)
    const combinedPrice = packagePrice + tickePrice
    console.log(" - combinedPrice", combinedPrice)
    if(combinedPrice <= bestPrice) {
      bestPrice = combinedPrice
      bestOptions = [...passCombination, ...itemsNotCovered(optionsToPassArray(options),itemsFromPassCombination(passCombination,passes))]
    }
  })
  return {price: bestPrice, options: bestOptions}
}

// export const passCombinations = generateAllPassCombinations(passes)

const getTicketPriceIds = (student = false,individualTickets) => {
  
  const ticketNames = Object.keys(individualTickets).reduce((returnObj,day) => {
    const keys = Object.keys(individualTickets[day])
    return {...returnObj, ...keys.reduce((returnObj,key) => {
      // [`${day} ${key}`
      return individualTickets[day][key][student ? 'studentPriceId' : 'priceId'] ? {...returnObj, [`${day} ${key}`]: `${individualTickets[day][key][student ? 'studentPriceId' : 'priceId']}`} : returnObj
    },{})}
  },{}
)
  return ticketNames
}

const priceIds = (student = false, passes,individualTickets) => {
  const passPriceIds = Object.keys(passes).reduce((returnObj,key) => { 
    return {...returnObj, [key]: passes[key][student ? 'studentPriceId' : 'priceId']}
  },{})
  const ticketPriceIds = getTicketPriceIds(student,individualTickets)
  return {...passPriceIds,...ticketPriceIds}
}

const thingsToAccess = (selectedOptions:any) => {
  // console.log("Selected Options",selectedOptions)
  const access_order = [["Friday","Party"],["Saturday","Classes"],["Saturday","Dinner"],["Saturday","Party"],["Sunday","Classes"],["Sunday","Party"]]
  const access = access_order.map((access) => { return selectedOptions[access[0]][access[1]] ? 1 : 0 })
  // console.log(access)
  return access
}

const mapItemsToAccessArray = (itemsList: string[]) => {
  const accessOrder = ["Friday Party", "Saturday Classes", "Saturday Dinner", "Saturday Party", "Sunday Classes", "Sunday Party"];
  // create set which will remove duplicates
  const uniqueItems = new Set(itemsList);
  //for each item in the access if uniqueItems has it then put 1, if not but 0
  return accessOrder.map(item => uniqueItems.has(item) ? 1 : 0);
}

const passInCombination = (pass:Pass, combinations: string[]) => {
  const superSet = new Set(combinations) 
  const subSet = new Set(pass.combination)
  return subSet.isSubsetOf(superSet)

}

const pricingDataToOptions = (pricingData) => {
  return pricingData ? pricingData.reduce((obj,event) => {
    let eventObj = {}
    eventObj[event.SK] = event.individual_items.reduce((obj,item) => {
      let itemObj = {}
      itemObj[item.SK] = false
      return {...obj, ...itemObj}  
    },{})
    return {...obj, ...eventObj}
  },{}) : {}
}

//! Todo get rid of dummy data
const pricingDataToPasses = (pricingData) => {
  return pricingData ? pricingData.reduce((obj,event) => {
    event.passes.reduce((obj,pass) => {
      obj[pass.SK] = {
        name: pass.name,
        cost: pass.current_price,
        studentCost: 0,
        isAvailable: pass.active > 0 ? true : false,
        saving: 2,
        studentSaving: 2,
        combination: pass.associated_items.map(item => `${event.SK} ${item.item}`),
        description: pass.description,
        priceId: 'price_1QQneIEWkmdeWsQPJhsLrRof',
        studentPriceId: 'price_1QQnjjEWkmdeWsQPgurnBDwI'
      }
      return obj
    },obj)
    return obj
  },{}): {}
}

const pricingDataToTickets = (pricingData) => {
  return pricingData ? pricingData.reduce((obj,event) => {
    let eventObj = {}
    eventObj[event.SK] = event.individual_items.reduce((obj,item) => {
      let itemObj = {}
      itemObj[item.SK] = item
      return {...obj, ...itemObj}  
    },{})
    return {...obj, ...eventObj}
  },{}) : []
}

export { 
  calculateTotalCost, 
  passOrTicket, 
  optionsToPassArray, 
  availableOptionsForDay, 
  isAllDayOptions, 
  isAllPassOptions, 
  priceForPassCombination, 
  itemsFromPassCombination, 
  priceForIndividualItems, 
  itemsNotCovered, 
  getBestCombination, 
  priceIds, 
  thingsToAccess, 
  mapItemsToAccessArray, 
  passInCombination,
  pricingDataToOptions,
  pricingDataToPasses,
  pricingDataToTickets,
}
