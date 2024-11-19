/****************************
 * AUTO GENERATED BY LAMBDA *
 ****************************/
import {IndividualTickets, Passes } from './pricingTypes'

export const individualTickets: IndividualTickets = { 
	Friday: { 
		 Party:{
			 cost: 20,
			 studentCost: 15,
			 isAvailable: true,
			 priceId: 'price_1PwoMhEWkmdeWsQPEenyN1wb',
			 studentPriceId: 'price_1PwoN0EWkmdeWsQP0p4tP5QK'
			 },
		},
	Saturday: { 
		 Party:{
			 cost: 25,
			 studentCost: 22,
			 isAvailable: true,
			 priceId: 'price_1PwoNnEWkmdeWsQPVKV6v05d',
			 studentPriceId: 'price_1PwoO4EWkmdeWsQPKvKLoBI6'
			 },
		 Dinner:{
			 cost: 42.5,
			 studentCost: 38.5,
			 isAvailable: false,
			 priceId: 'price_1PwoQbEWkmdeWsQPz0vieQFz',
			 studentPriceId: 'price_1PwoQrEWkmdeWsQPx6rcHJ8V'
			 },
		 Classes:{
			 cost: 55,
			 studentCost: 55,
			 isAvailable: true,
			 priceId: 'price_1PwoPREWkmdeWsQPIB87h5gN',
			 studentPriceId: 'price_1PwoPREWkmdeWsQPIB87h5gN'
			 },
		},
	Sunday: { 
		 Classes:{
			 cost: 55,
			 studentCost: 55,
			 isAvailable: true,
			 priceId: 'price_1PwoPvEWkmdeWsQPpJTEre5x',
			 studentPriceId: 'price_1PwoPvEWkmdeWsQPpJTEre5x'
			 },
		 Party:{
			 cost: 20,
			 studentCost: 15,
			 isAvailable: true,
			 priceId: 'price_1PwoOYEWkmdeWsQPxRBOlFgr',
			 studentPriceId: 'price_1PwoOqEWkmdeWsQPYGIhbZJZ'
			 },
		},
 }

export const initialSelectedOptions = {
	Friday: { 
		Party: false,
		},
	Saturday: { 
		Party: false,
		Dinner: false,
		Classes: false,
		},
	Sunday: { 
		Classes: false,
		Party: false,
		},
 }

// Binary version = [Friday BiParty,Saturday Class Pass,Saturday Dinner,Saturday Party,Sunday Class Pass,Sunday Party]
export const passes: Passes = {
	'Party Pass': {
		 cost: 45,
		 studentCost: 35,
		 isAvailable: true,
		 saving: 20,
		 studentSaving: 17,
		 combination: ['Friday Party', 'Saturday Party', 'Sunday Party'],
		 description: "Party away every single night, the ultimate party weekend",
		 priceId: 'price_1PwoJTEWkmdeWsQPsjvndOcy',
		 studentPriceId: 'price_1PwoJoEWkmdeWsQPl331ijir'},
	'Sunday Pass': {
		 cost: 59,
		 studentCost: 59,
		 isAvailable: true,
		 saving: 16,
		 studentSaving: 11,
		 combination: ['Sunday Classes', 'Sunday Party'],
		 description: "The whole Sunday experience",
		 priceId: 'price_1PwoI8EWkmdeWsQPpVotxewC',
		 studentPriceId: 'price_1PwoI8EWkmdeWsQPpVotxewC'},
	'Dine and Dance Pass': {
		 cost: 60,
		 studentCost: 55,
		 isAvailable: false,
		 saving: 15,
		 studentSaving: 20,
		 combination: ['Saturday Dinner', 'Saturday Party'],
		 description: "Saturday evening is covered including the gala dinner",
		 priceId: 'price_1PwoLAEWkmdeWsQPg2p9IcuJ',
		 studentPriceId: 'price_1PwoLsEWkmdeWsQPreRyDhg2'},
	'Saturday Pass': {
		 cost: 65,
		 studentCost: 60,
		 isAvailable: true,
		 saving: 15,
		 studentSaving: 20,
		 combination: ['Saturday Classes', 'Saturday Party'],
		 description: "The entire Saturday dancing experience (does not include Gala Dinner)",
		 priceId: 'price_1QJHjxEWkmdeWsQPMmAVGy2C',
		 studentPriceId: 'price_1QJHkIEWkmdeWsQPRt1S9pQq'},
	'Full Pass': {
		 cost: 125,
		 studentCost: 105,
		 isAvailable: true,
		 saving: 92.5,
		 studentSaving: 95.5,
		 combination: ['Friday Party', 'Saturday Classes', 'Saturday Party', 'Sunday Classes', 'Sunday Party'],
		 description: "All the dancing the festival has at the best rate! If you're looking for the best deal this is it (does not include Gala Dinner)",
		 priceId: 'price_1QJHdOEWkmdeWsQPygahmu3V',
		 studentPriceId: 'price_1QJHeSEWkmdeWsQPJzNYTDs1'},
	'Class Pass': {
		 cost: 95,
		 studentCost: 95,
		 isAvailable: true,
		 saving: 15,
		 studentSaving: 15,
		 combination: ['Saturday Classes', 'Sunday Classes'],
		 description: "All the daytime classes for the weekend",
		 priceId: 'price_1PwoKTEWkmdeWsQP3pYUjaMp',
		 studentPriceId: 'price_1PwoKTEWkmdeWsQP3pYUjaMp'},

}

export const fullPassName = Object.keys(passes).at(4)
export const days = ['Friday', 'Saturday', 'Sunday']
export const passTypes = Object.keys(individualTickets['Saturday']).filter((item) => individualTickets['Saturday'][item].isAvailable) //['Party', 'Classes', 'Dinner']

