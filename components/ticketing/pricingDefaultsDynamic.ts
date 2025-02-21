/****************************
 * AUTO GENERATED BY LAMBDA *
 ****************************/
import {IndividualTickets, Passes } from './pricingTypes'

export const individualTickets: IndividualTickets = { 
	Feb: { 
		 Prebook:{
			 cost: 2,
			 studentCost: 2,
			 isAvailable: true,
			 priceId: 'price_1QQZObEWkmdeWsQPPK90RMv5',
			 studentPriceId: 'price_1QQZOtEWkmdeWsQPGgDY1I8x'
		},
		Advanced:{
			cost: 12,
			studentCost: 10,
			isAvailable: true,
			priceId: 'price_1QQZObEWkmdeWsQPPK90RMv5',
			studentPriceId: 'price_1QQZOtEWkmdeWsQPGgDY1I8x'
		},
	},		
	March: { 
		Prebook:{
			cost: 2,
			studentCost: 2,
			isAvailable: true,
			priceId: 'price_1QQZObEWkmdeWsQPPK90RMv5',
			studentPriceId: 'price_1QQZOtEWkmdeWsQPGgDY1I8x'
	 },
	 Advanced:{
		 cost: 12,
		 studentCost: 10,
		 isAvailable: true,
		 priceId: 'price_1QQZObEWkmdeWsQPPK90RMv5',
		 studentPriceId: 'price_1QQZOtEWkmdeWsQPGgDY1I8x'
	 },
 },		
 }

export const initialSelectedOptions = {
	Feb: { 
		Prebook: false,
		Advanced: false
	},
	March: { 
		Prebook: false,
		Advanced: false
	}
 }

// Binary version = [Friday BiParty,Saturday Class Pass,Saturday Dinner,Saturday Party,Sunday Class Pass,Sunday Party]
export const passes: Passes = {
	'Febuary Pre Book': {
			cost: 0,
			studentCost: 0,
			isAvailable: true,
			saving: 2,
			studentSaving: 2,
			combination: ['Feb Prebook'],
			description: "Guarantee your place and save, Pay £12 when you arrive",
			priceId: 'price_1QQneIEWkmdeWsQPJhsLrRof',
			studentPriceId: 'price_1QQnjjEWkmdeWsQPgurnBDwI'},
	'Febuary Advanced': {
			cost: 12,
			studentCost: 10,
			isAvailable: true,
			saving: 2,
			studentSaving: 2,
			combination: ['Feb Prebook', 'Feb Advanced'],
			description: "Book in advance and save on the door",
			priceId: 'price_1QQneIEWkmdeWsQPJhsLrRof',
			studentPriceId: 'price_1QQnjjEWkmdeWsQPgurnBDwI'},
}

export const fullPassName = Object.keys(passes).at(0)
export const days = ['Feb','March']
export const passTypes = Object.keys(individualTickets['Feb']).filter((item) => {
	console.log(Object.keys(individualTickets['Feb']))
	console.log(individualTickets['Feb'][item])
	console.log(individualTickets['Feb'][item].isAvailable)
		return individualTickets['Feb'][item].isAvailable
}) //['Party', 'Classes', 'Dinner']
