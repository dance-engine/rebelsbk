'use client'
import { useEffect, useState } from "react";
import { moneyString } from '../../lib/useful'
import {getBestCombination,priceIds, pricingDataToPasses, pricingDataToTickets } from "@components/ticketing/pricingUtilities"
import MealPreferences, { blankPreferences } from "@components/preferences/MealPreferences"
import {Container} from "@components/layout/container"
import {Icon} from "@components/icon"
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'
import StripeForm from "./stripe"
import { fetcher } from '../../lib/fetchers'
import useSWR from 'swr';

type fieldEntry = {name: string, label?: string, placeholder?: string, type?: string, value?: string | number, error?: string, width?: string  }

export default function CheckoutClient() {
  const {data: pricingData, error, isLoading, isValidating} = useSWR(`/api/pricing_table`, fetcher, { keepPreviousData: false });
  const [preferences, setPreferences] = useState(blankPreferences)
  const [selectedOptions, setSelectedOptions] = useState({} as any)
  const [passes,setPasses] = useState({})
  const [individualTickets,setIndividualTickets] = useState([])
  const [stripeProducts,setStripeProducts] = useState(false as boolean | string[])
  const [userData, setUserData] = useState(false as any)
  const [student, setStudent] = useState(false as boolean)
  const [steps, setSteps] = useState({details: false, meal: false, payment: false})
  const [bestCombo,setBestCombo] = useState({price:0, options: []})

  const yourDetailsFields: fieldEntry[] = [
    {name: 'name', placeholder: "Johnn Salsa", width: "w-80", label: "Full Name"},
    {name: 'email', placeholder: "johnny@salsa.com", type: "email", width: "w-96"},
    {name: 'phone', placeholder: "0770912781367", width: "w-96"},
    {name: 'number_of_tickets', value: 1, type: "hidden"},
  ]

  const nextStep = (step) => {
    const newSteps = {...steps}
    newSteps[step] = true
    setSteps(newSteps)
  }

  useEffect(() => {
    const loadedOptions = JSON.parse(localStorage.getItem("selectedOptions"))
    const loadedStudent = JSON.parse(localStorage.getItem("student"))
    setSelectedOptions(loadedOptions)
    setStudent(loadedStudent)
    console.info("Loaded Options",loadedOptions)

  },[])

  useEffect(() => {
    const calculatedBestCombo = getBestCombination(selectedOptions,student ? 'studentCost':'cost',individualTickets, passes)
    setBestCombo(calculatedBestCombo)
    console.log("Best Combo - ",bestCombo,selectedOptions)
  },[selectedOptions,student])

  useEffect(() => {
    const allPassAndTicketPriceIds = priceIds(student,passes,individualTickets)
    // console.log("All Pass and Ticket Price Ids",allPassAndTicketPriceIds)
    const selectedPassPriceIds = bestCombo.options.map(pass => allPassAndTicketPriceIds[pass])
    // console.log("Selected Pass Price Ids",selectedPassPriceIds)
    setStripeProducts(selectedPassPriceIds)
  },[bestCombo,student])

  const freeCheckout = (action) => {
    alert(JSON.stringify([action,userData,preferences,stripeProducts]))
  }

  useEffect(() => {
    // Generate Passes
    const passesGenerated = pricingDataToPasses(pricingData)
    // console.log("passesGenerated",passesGenerated)
    setPasses(passesGenerated)

    const generatedIndividualTicket = pricingDataToTickets(pricingData)
    // console.log("generatedIndividualTicket",generatedIndividualTicket)
    setIndividualTickets(generatedIndividualTicket)

  },[pricingData])


  const dinnerInfoRequired = selectedOptions && selectedOptions['Saturday'] && selectedOptions['Saturday']['Dinner']
  const stripeReady = stripeProducts && typeof stripeProducts === "object" && stripeProducts.length > 0
  const dinnerInfoProvided = (!dinnerInfoRequired || (preferences && preferences.choices && preferences.choices.every((choice) => choice >= 0)))
  if(error) { return <div>error</div>}
  if(isLoading) { return <div>isLoading</div>}
  
  const has_events = pricingData?.length > 0 
  if(has_events) {
    return (
      <div className="">
        <Container size="small" width="medium" className=" text-white w-full py-0">
        <div className="intro">
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
          <p>Nearly there! We just need a few details from you (and some money of course) and you&apos;ll be all booked in.</p>
        </div>
        </Container>

        <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-6 transition-all	">
          <h2 className="text-xl flex items-center -ml-14 ">
            <Icon data={{name: "BiCart", color: "purple", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
            {student ? "Student " : null}Passes selected
          </h2>
          {bestCombo.options.join(', ')} : {moneyString(bestCombo.price)}
        </Container>

        <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-6 transition-all	">
        <h2 className="text-xl flex items-center -ml-14 ">
          <Icon data={{name: "BiUser", color: "blue", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
          Attendee details
        </h2>
        { steps.details ? (
            <>
              Name: {userData.name} <br/>
              Email: {userData.email}<br/>
              Phone: {userData.phone}<br/>
              <button className="mt-3 border px-6 py-1 border-white rounded-md" onClick={() => setSteps({...steps,details:false})}>Edit</button>
            </>) :
            (<>
              <p className="text-sm">These ones should be relatively easy to fill out</p>
            
              {yourDetailsFields.map((field) => {
                  const statusClass = field.error ? "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500" : ""
                  const otherClass = field.width ? field.width : "w-40 md:w-64 max-w-full"
                return (
                  <div className="mt-3" key={field.name}>
                    { field.type && field.type == 'hidden' ? null 
                    : <label htmlFor={field.name} className="block text-sm font-medium leading-6 text-white capitalize">
                        {field.label || field.name }
                      </label>
                    }
                      
                    <div className="relative mt-2 rounded-md shadow-sm">
                      <input
                        id={field.name}
                        name={field.name}
                        type={field.type || "text"}
                        placeholder={field.placeholder || null}
                        defaultValue={userData[field.name] || null}
                        aria-invalid="true"
                        aria-describedby={`${field.name}-error`}
                        onChange={(e) => {
                          setUserData({...userData, [field.name]: e.target.value})
                        }}
                        className={`block rounded-md border-0 py-1.5 pr-10 ring-1 ring-inset focus:ring-2 focus:ring-inset text-gray-900 sm:text-sm sm:leading-6 max-w-full ${statusClass} ${otherClass}`}
                      />
                      { field.error ? <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <ExclamationCircleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
                      </div> : null }
                    </div>
                    {field.error ? <p id={`${field.name}-error`} className="mt-2 text-sm text-red-600">Not a valid email address.</p> : null }
                  </div>
                )
              })}

              <button className="bg-chillired-400 px-6 py-2 rounded" onClick={() => nextStep('details')}>Continue</button>
            </>)
        }
      </Container>
      {dinnerInfoRequired ? (
      <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 pb-6">
        <><h2 className="text-xl flex items-center -ml-14 mt-6">
          <Icon data={{name: "BiBowlHot", color: "red", style: "circle", size: "medium"}} className="mr-2"></Icon>
          Dinner Preferences
        </h2>
        { steps.details && !steps.meal ? <>
        <p className="text-sm">If you don&apos;t know the answer to some of these things you can always update preferences later</p>
        <MealPreferences preferences={preferences} setPreferences={setPreferences}></MealPreferences>
        <button className="bg-chillired-400 px-6 py-2 rounded" onClick={() => nextStep("meal")}>Continue</button>
        </> : steps.meal ? (<><p>Meal details entered</p><button className="mt-3 border px-6 py-1 border-white rounded-md" onClick={() => setSteps({...steps,meal:false})}>Edit</button></>) : "Complete attendee details first " }
        </>
      </Container>) : null }
      
      { bestCombo.price > 0 ?
      <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-0 md:pt-6 pb-6 md:pb-16 px-3 md:px-0 flex flex-col ">
        <h2 className="text-xl flex items-center -ml-12 md:-ml-6">
        <Icon data={{name: "BiPound", color: "green", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
          Payment
        </h2>
        {dinnerInfoProvided && userData.email && stripeReady && steps.details && ( steps.meal || !dinnerInfoRequired)  ?
          <StripeForm userData={userData} preferences={preferences} products={stripeProducts}></StripeForm>
          : <div className="text-center"><h2 className="text-2xl">Not Ready for payment</h2><p>Payment form will load once you have finished editing the above information</p></div>
        }
      </Container> : 
      <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-0 md:pt-6 pb-6 md:pb-16 px-3 md:px-0 flex flex-col ">
        <h2 className="text-xl flex items-center -ml-12 md:-ml-6">
          <Icon data={{name: "BiPound", color: "green", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
          It&apos;s free!
        </h2>
        {dinnerInfoProvided && userData.email && stripeReady && steps.details && ( steps.meal || !dinnerInfoRequired)  ?
          <form action={freeCheckout} className="">
            <div className="px-6 pt-6 ">
              <button
                type="submit"
                className="py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold shadow-sm">
                Complete Booking
              </button>
            </div>
          </form>
          
          : <div className="text-center"><h2 className="text-2xl">Finish adding your details</h2><p>As soon as you&apos;ve added your information we can book you in</p></div>
        }
        

      </Container> }

      
      { process.env.NODE_ENV == 'development' && process.env.NEXT_PUBLIC_INTERNAL_DEBUG == 'true' ? <>
        <hr />
        <h2>Debug Ignore below the line</h2>
        <div className=' text-white text-xs'>
          <pre>{JSON.stringify(selectedOptions,null,2)}</pre>
          <pre>{JSON.stringify(stripeProducts,null,2)}</pre>
          <pre>userData -- {JSON.stringify(userData,null,2)}</pre>
          <pre>Info for Stripe -- {dinnerInfoProvided ? "true" : "false"} {userData.email} {stripeReady ? "true" : "false"} {JSON.stringify(steps)} </pre>
        </div>
        </> : null }
      </div>
      
    )
  }

}