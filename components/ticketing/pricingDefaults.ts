export  { individualTickets, passes } from './pricingDefaultsDynamic'
// import { individualTickets, passes } from './pricingDefaultsDynamic'
import { passes } from './pricingDefaultsDynamic'
import type { PartialSelectedOptions } from './pricingTypes'

export const initialSelectedOptions = {
  Feb: {
    Prebook: false,
    Advanced: false
    // Classes: false,
    // Dinner: false
  }  
} as PartialSelectedOptions

export const fullPassName = Object.keys(passes).filter((pass) => { return passes[pass].isAvailable }).reduce((passInfo,passName) => {
  const pass = passes[passName]
  return pass.cost > passInfo.cost ? { passName: passName, cost: pass.cost } : passInfo
},{passName:'None',cost:-1 }).passName //at(4)
export const days = ['Feb','March']
// export const passTypes = Object.keys(individualTickets['Saturday']).filter((item) => individualTickets['Saturday'][item].isAvailable) //['Party', 'Classes', 'Dinner']

export const passTypes = ['Prebook',"Advanced"] //.filter((item) => individualTickets['Feb'][item].isAvailable)