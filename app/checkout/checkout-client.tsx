'use client'
import { useRouter} from 'next/navigation'
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
import { getUnixTime } from 'date-fns'
import Alert from '@components/generic/alert'
import Confirmation from '@components/admin/forms/Confirmation';
import DatePicker from '@components/admin/forms/DatePicker';
import Select from '@components/admin/forms/Select';

type fieldEntry = {name: string, label?: string, placeholder?: string, type?: string, value?: string | number, error?: string, width?: string , options?: string[]}
type statusMessageType = { message:string, type:string,dismissFunction:Function } | boolean

export default function CheckoutClient() {
  const router = useRouter()
  const {data: pricingData, error, isLoading} = useSWR(`/api/pricing_table`, fetcher, { keepPreviousData: false });
  const [preferences, setPreferences] = useState(blankPreferences)
  const [selectedOptions, setSelectedOptions] = useState({} as any)
  const [passes,setPasses] = useState({})
  const [individualTickets,setIndividualTickets] = useState([])
  const [stripeProducts,setStripeProducts] = useState(false as boolean | string[])
  // const [userData, setUserData] = useState(false as any)
  const [userData, setUserData] = useState({name: "Adam", email: "adam.bardsley@gmail.com", phone: "234567890"} as any)
  const [student, setStudent] = useState(false as boolean)
  const [steps, setSteps] = useState({details: false, meal: false, payment: false})
  const [bestCombo,setBestCombo] = useState({price:0, options: []})
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage,setStatusMessage] = useState(false as statusMessageType)
  const [errors,setErrors] = useState({})

  const yourDetailsFields: fieldEntry[] = [
    {name: 'name', placeholder: "Johnn Salsa", width: "w-80", label: "Full Name"},
    {name: 'email', placeholder: "johnny@salsa.com", type: "email", width: "w-96"},
    {name: 'phone', placeholder: "0770912781367", width: "w-96"},
    {name: 'number_of_tickets', value: 1, type: "hidden"},
    {name: 'marketing', type: "confirmation", label: "Are you happy to hear about other events and offers from Rebel SBK and Dance Engine?"}
  ]
  
  const yourAnswerFields: fieldEntry[] = [
    {name: 'started_dancing', label: "Roughly when did you start dancing?", type: 'date_picker'},
    {name: 'dance_style', label: "What style do you like to dance?", width: "w-80",},
    {name: 'heard_about', label: "How did you hear about us?", type: "select", options: ["Social Media","Fellow dancer Recommendation","Artist Promotion","Class or Event","Flyer","Email","Google Search"]},
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
    if(Object.keys(passes).length == 0) { console.log("Empty") }
    const calculatedBestCombo = getBestCombination(selectedOptions,student ? 'studentCost':'cost',individualTickets, passes)
    setBestCombo(calculatedBestCombo)
    console.log("Best Combo -","\nbestCombo",bestCombo,"\nselectedOptions",selectedOptions)
  },[selectedOptions,student,passes,individualTickets])

  useEffect(() => {
    const allPassAndTicketPriceIds = priceIds(student,passes,individualTickets)
    // console.log("All Pass and Ticket Price Ids",allPassAndTicketPriceIds)
    const selectedPassPriceIds = bestCombo.options.map(pass => allPassAndTicketPriceIds[pass])
    // console.log("Selected Pass Price Ids",selectedPassPriceIds)
    setStripeProducts(selectedPassPriceIds)
  },[bestCombo,student])

  // const freeCheckout = (action) => {
  //   alert(JSON.stringify([action,userData,preferences,stripeProducts]))
  // }

  useEffect(() => {
    if(pricingData) {
      // Generate Passes
      const passesGenerated = pricingDataToPasses(pricingData)
      console.log("passesGenerated",passesGenerated)
      setPasses(passesGenerated)
  
      const generatedIndividualTicket = pricingDataToTickets(pricingData)
      // console.log("generatedIndividualTicket",generatedIndividualTicket)
      setIndividualTickets(generatedIndividualTicket)
  
    }
  },[pricingData])

  const validateForm = (userData) => {
    let newErrors = {}
    if(!(userData?.name && userData?.name.split(" ").length >= 2)) {
      newErrors = {...newErrors, 'name': `"${userData.name}" isn't a full name`}
    } 
    if(!(userData?.email && userData?.email.split("@").length == 2)) {
      newErrors = {...newErrors, 'email': `"${userData.email}" isn't a valid email`}
    } 
    if(!(userData?.marketing)) {
      newErrors = {...newErrors, 'marketing': `Can we send you info about events?`}
    } 
    console.error(newErrors)
    setErrors(newErrors)
    return Object.keys(newErrors).length < 1 ? true : false
  }

  async function freeCheckout() {
    const purchaseObj = bestCombo.options.map((option) => {
      const pass = passes[option]
      // console.log(pass)

      const line_item = {
        'amount_total': pass.cost,  //studentDiscount ? line_item.cost * 100 : line_item.studentCost * 100,
        'description': pass.name,
        'price_id': option,
      }
      return {
        'email': userData.email,       
        'full_name': userData.name,
        'phone': userData.phone,
        'marketing': userData.marketing == 'true' ? true : userData.marketing == 'false' ? false : null,
        'purchase_date': getUnixTime(new Date()) ,
        'line_items': [line_item],
        'access': bestCombo.price == 0 ? [0,0,0,0,0,0] : [1,0,0,0,0,0], //! use selectedAccessArray instead
        'status': bestCombo.price == 0 ? "prebook" : "paid",
        'student_ticket': false,
        'event': pass.combination[0].split(" ")[0],
        'checkout_session': "none", 
        'checkout_amount': bestCombo.price, 
        'heading_message':"THANK YOU FOR YOUR BOOKING",
        'send_standard_ticket': true,
        'answers': userData.answers
      }
    })
    // console.log("Purchase object",purchaseObj)
    const apiResponse = await fetch('/api/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchaseObj),
    })
    console.log("apiResponse",apiResponse)
    const apiData = await apiResponse.json() 
    console.log(apiData)
    // const apiAmmendedData = apiResponse.ok ? apiData : {...apiData, ticket_number: false }
    // console.log("apiData",apiAmmendedData)
    // setTicket(apiData.ticket_number)
    if(!apiResponse.ok) {
      console.error("Broken")
      setStatusMessage({message: "Could not create all tickets", type:'bad', dismissFunction: ()=>{setStatusMessage(false);}} satisfies statusMessageType)
      setSubmitting(false)
    } else {
      router.push(`/checkout/complete?message=${encodeURIComponent('Tickets have been sent')}&type=good`) 
    }
  }


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
        <div className="intro mb-6">
          <h1 className="text-3xl font-bold text-white">Checkout</h1>
          <p>Nearly there! We just need a few details from you and you&apos;ll be all booked in.</p>
        </div>
        { typeof statusMessage !== "boolean" ? <Alert message={statusMessage.message} type={statusMessage.type} dismissFunction={statusMessage.dismissFunction}/> : null }
        </Container>

        <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-6 transition-all	">
          <h2 className="text-xl flex items-center -ml-14 ">
            <Icon data={{name: "BiCart", color: "purple", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
            {student ? "Student " : null}Passes selected
          </h2>
          {/* {JSON.stringify(bestCombo,null,2)} */}
          {bestCombo.options.map((index)=>{ return passes[index]?.name}).join(', ') } - {moneyString(bestCombo.price)}
        </Container>

        <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-6 transition-all	">
        <h2 className="text-xl flex items-center -ml-14 ">
          <Icon data={{name: "BiUser", color: "blue", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
          Attendee details
        </h2>
        { steps.details ? (
            <>
              Name: {userData.name } <br/>
              Email: {userData.email }<br/>
              Phone: {userData.phone }<br/>
              {userData.marketing == "true" ? "Send me details about events/offers" : "Only contact me about this ticket"}<br/>
              <button className="mt-3 border px-6 py-1 border-white rounded-md" onClick={() => setSteps({...steps,details:false})}>Edit</button>
            </>) :
            (<>
              <p className="text-sm">These ones should be relatively easy to fill out</p>
            
              {yourDetailsFields.map((field) => {
                  const statusClass = field.error ? "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500" : ""
                  const otherClass = field.width ? field.width : "w-40 md:w-64 max-w-full"
                  if(field.type == 'confirmation') {
                    return <div className="mt-3" key={field.name}>
                        <Confirmation key={field.name} field={field} currentValue={userData[field.name]} onChange={(e) => { setUserData({...userData, [field.name]: e.target.value})}}/>
                        {errors[field.name] ? <p id={`${field.name}-error`} className="mt-0 text-sm text-red-600 mb-3">{errors[field.name]}</p> : null }
                      </div>
                  } else if(field.type == 'date_picker') {
                    return <Confirmation key={field.name} field={field} currentValue={userData[field.name]} onChange={(e) => {
                      console.log("Event",e,{...userData, [field.name]: e.target.value})
                      setUserData({...userData, [field.name]: e.target.value})
                    }}/>
                  } else if(field.type == 'select') {
                    return <Select key={field.name} field={field} initialValue={userData[field.name]} onChange={(e) => {
                      console.log("Event",e,{...userData, [field.name]: e.target.value})
                      setUserData({...userData, [field.name]: e.target.value})
                    }}/>
                  } else {
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
                            defaultValue={userData[field.name] }
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
                        {errors[field.name] ? <p id={`${field.name}-error`} className="mt-2 text-sm text-red-600">{errors[field.name]}</p> : null }
                      </div>
                    )
                  }
                
              })}


              <button className="bg-blue-400 px-6 py-2 rounded mt-3" onClick={() => { if(validateForm(userData)) { nextStep('details'); } }}>Continue</button>
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
        <Container size="small" width="medium" className=" text-white w-full rounded-3xl border border-richblack-700 bg-richblack-500 py-6 transition-all	">
        <h2 className="text-xl flex items-center -ml-14">
          <Icon data={{name: "BiPound", color: "green", style: "circle", size: "medium"}} className="mr-2 border border-richblack-700"></Icon>
          It&apos;s free!
        </h2>
        {dinnerInfoProvided && userData.email && stripeReady && steps.details && ( steps.meal || !dinnerInfoRequired)  ?
          <>
          {yourAnswerFields.map((field) => {
                  const statusClass = field.error ? "text-red-900 ring-red-300 placeholder:text-red-300 focus:ring-red-500" : ""
                  const otherClass = field.width ? field.width : "w-40 md:w-64 max-w-full"
                  if(field.type == 'confirmation') {
                    return <Confirmation key={field.name} field={field} currentValue={userData.answers?.[field.name]} onChange={(e) => {
                      console.log("Event",e,{...userData, [field.name]: e.target.value})
                      setUserData({...userData, answers: {...userData.answers, [field.name]: e.target.value}})
                    }}/>
                  } else if(field.type == 'date_picker') {
                    return <DatePicker key={field.name} field={field} initialValue={userData.answers?.[field.name]} onChange={(e) => {
                      console.log("Event",e,{...userData, [field.name]: e})
                      setUserData({...userData, answers: {...userData.answers, [field.name]: e}})
                    }}/>
                  } else if(field.type == 'select') {
                    return <Select key={field.name} field={field} initialValue={userData.answers?.[field.name]} onChange={(e) => {
                      console.log("Event",e,{...userData, [field.name]: e})
                      setUserData({...userData, answers: {...userData.answers, [field.name]: e}})
                    }}/>
                  } else {
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
                            defaultValue={userData[field.name] }
                            aria-invalid="true"
                            aria-describedby={`${field.name}-error`}
                            onChange={(e) => {
                              setUserData({...userData, answers: {...userData.answers, [field.name]: e.target.value}})
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
                  }
              })}

            <form action={freeCheckout} className="">
              <div className="px-0 pt-6 ">
                <button
                  type="submit"
                  onClick={()=>{setSubmitting(true)}}
                  className="py-2 px-4 bg-green-500 text-white rounded-lg font-semibold shadow-sm">
                  {submitting ? "Please wait" : "Complete Booking"}
                </button>
              </div>
            </form>
            
          </>
          
          : <div className="text-center"><h2 className="text-2xl">Finish adding your details</h2><p>As soon as you&apos;ve added your information we can book you in</p></div>
        }
        

      </Container> }

      
      { process.env.NODE_ENV == 'development' && process.env.NEXT_PUBLIC_INTERNAL_DEBUG == 'true' ? <>
        <hr />
        <h2>Debug Ignore below the line</h2>
        <div className=' text-white text-xs'>
          <pre>{JSON.stringify(userData,null,2)}</pre>
          <pre>{JSON.stringify(selectedOptions,null,2)}</pre>
          <pre>{JSON.stringify(bestCombo,null,2)}</pre>
          {/* <pre>{JSON.stringify(stripeProducts,null,2)}</pre> */}
          {/* <pre>userData -- {JSON.stringify(userData,null,2)}</pre>
          <pre>Info for Stripe -- {dinnerInfoProvided ? "true" : "false"} {userData.email} {stripeReady ? "true" : "false"} {JSON.stringify(steps)} </pre> */}
        </div>
        </> : null }
      </div>
      
    )
  }

}