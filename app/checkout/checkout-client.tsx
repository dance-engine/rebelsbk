'use client'
import { useEffect, useState } from "react";
import {getBestCombination,priceIds } from "../../components/ticketing/pricingUtilities"
import MealPreferences from "../../components/preferences/MealPreferences"
import {Container} from "../../components/layout/container"
import {Icon} from "../../components/icon"
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'
import StripeForm from "./stripe"

type fieldEntry = {name: string, label?: string, placeholder?: string, type?: string, value?: string | number, error?: string, width?: string  }

export default function CheckoutClient() {
  const [preferences, setPreferences] = useState(false as boolean | string | any[])
  const [selectedOptions, setSelectedOptions] = useState({} as any)
  const [stripeProducts,setStripeProducts] = useState(false as boolean | string[])

  const yourDetailsFields: fieldEntry[] = [
    {name: 'name', placeholder: "John Doe", width: "w-80", label: "Full Name"},
    {name: 'email', placeholder: "John Doe", type: "email", width: "w-96"},
    {name: 'number_of_tickets', value: 1, type: "hidden"},
  ]

  useEffect(() => {
    const loadedOptions = JSON.parse(localStorage.getItem("selectedOptions"))
    setSelectedOptions(loadedOptions)
    console.log("Loaded Options",loadedOptions)
  },[])

  useEffect(() => {
    const bestCombo = getBestCombination(selectedOptions,'cost')
    console.log("Best Combo",bestCombo)
    const allPassAndTicketPriceIds = priceIds()
    console.log("All Pass and Ticket Price Ids",allPassAndTicketPriceIds)
    const selectedPassPriceIds = bestCombo.options.map(pass => allPassAndTicketPriceIds[pass])
    console.log("Selected Pass Price Ids",selectedPassPriceIds)
    setStripeProducts(selectedPassPriceIds)
  },[selectedOptions])

  return (
    <Container size="small" width="large" className=" text-white w-full">
      <div className="intro mb-6">
        <h1 className="text-3xl font-bold text-white">Checkout</h1>
        <p>Nearly there! We just need a few details from you (and some money of course) and you&apos;ll be all booked in.</p>
      </div>
      <h2 className="text-xl flex items-center -ml-16 ">
        <Icon data={{name: "BiUser", color: "blue", style: "circle", size: "medium"}} className="mr-4"></Icon>
        Your details
      </h2>
      <p className="text-sm">These ones should be relatively easy to fill out</p>
    
      {yourDetailsFields.map((field) => {
          const statusClass = field.error ? "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500" : ""
          const otherClass = field.width ? field.width : "w-64"
         return (
          <div className="mt-3" key={field.name}>
            { field.type && field.type == 'hidden' ? null 
            : <label htmlFor="email" className="block text-sm font-medium leading-6 text-white capitalize">
                {field.label || field.name }
              </label>
            }
              
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                defaultValue="adamwathan"
                id={field.name}
                name={field.name}
                type={field.type || "text"}
                placeholder={field.placeholder || null}
                aria-invalid="true"
                aria-describedby={`${field.name}-error`}
                className={`block rounded-md border-0 py-1.5 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset text-gray-900 sm:text-sm sm:leading-6 ${statusClass} ${otherClass}`}
              />
              { field.error ? <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ExclamationCircleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
              </div> : null }
            </div>
            {field.error ? <p id={`${field.name}-error`} className="mt-2 text-sm text-red-600">Not a valid email address.</p> : null }
          </div>
        )
      })}
      

     
      {selectedOptions && selectedOptions['Saturday'] && selectedOptions['Saturday']['Dinner'] ? (<><h2 className="text-xl flex items-center -ml-16 mt-6">
        <Icon data={{name: "BiBowlHot", color: "red", style: "circle", size: "medium"}} className="mr-4"></Icon>
        Dinner Preferences
      </h2>
      <p className="text-sm">If you don&apos;t know the answer to some of these things you can always update preferences later</p>
      <MealPreferences preferences={preferences} setPreferences={setPreferences}></MealPreferences>
      </>) : null }

      {stripeProducts && typeof stripeProducts === "object" && stripeProducts.length > 0 ? <StripeForm products={stripeProducts}></StripeForm> : null}
    </Container>
  )

}