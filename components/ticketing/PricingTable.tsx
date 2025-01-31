'use client'
import React, { useState, useEffect } from 'react';
import { useFormStatus } from "react-dom"
import Cell from './Cell';
import { initialSelectedOptions, fullPassName } from './pricingDefaults'
import { calculateTotalCost, passOrTicket, getBestCombination, itemsFromPassCombination, itemListToOptions, addToOptions } from './pricingUtilities'
import type { PartialSelectedOptions } from './pricingTypes'
import PassCards from './passes'
import { OptionsTable } from './OptionsTable';
import { useRouter } from 'next/navigation'
import { deepCopy, moneyString } from '../../lib/useful'
import symmetricDifference from 'set.prototype.symmetricdifference'
import difference from 'set.prototype.difference'
import useSWR from 'swr';
import { fetcher } from '../../lib/fetchers';
import Spinner from '../../components/generic/spinner'
// import { getNamedRouteRegex } from 'next/dist/shared/lib/router/utils/route-regex';
symmetricDifference.shim();
difference.shim();


const PricingTable = ({fullPassFunction,scrollToElement}:{fullPassFunction?:Function,scrollToElement?:Function}) => {
  // const [selectedOptions, setSelectedOptions] = useState(deepCopy(initialSelectedOptions) as PartialSelectedOptions); 
  const [selectedOptions, setSelectedOptions] = useState({})
  const [passes,setPasses] = useState({})
  const [individualTickets,setIndividualTickets] = useState([])
  
  const [studentDiscount, setStudentDiscount] = useState(false);
  const [priceModel, setPriceModel] = useState("cost")
  const [totalCost, setTotalCost] = useState(0);
  const [packages,setPackages] = useState([])
  const [packageCost, setPackageCost] = useState(0)
  const router = useRouter()

  const {data: pricingData, error, isLoading, isValidating} = useSWR(`/api/pricing_table`, fetcher, { keepPreviousData: false });
  // const {data: pricingData} = useSWR(`/api/pricing_table?event=${"spring-salsa-festival-2025"}`, fetcher, { keepPreviousData: false });

  const togglePriceModel = () => {
    setPriceModel(priceModel === "cost"? "studentCost" : "cost")
    setStudentDiscount(priceModel === "cost" ? true : false) //! This looks backwards but priceModel hasn't changed yet
  }

  const selectFullPass = (setTo,individualTickets,passes) => {
    console.log("Seelected fullpass")
    let initialOptions = selectedOptions
    const itemsInPassName = itemsFromPassCombination([fullPassName],passes) as string[]
    setSelectedOptions(addToOptions(initialOptions,itemListToOptions(itemsInPassName,setTo,individualTickets)))
  }

  const selectPassCombination = (individualTickets,passes) => {
    console.log("Selected best combo")
    const {price: suggestedCost, options: suggestedPackages} = getBestCombination(selectedOptions,priceModel,individualTickets,passes)
    console.log(`Suggested packages: ${suggestedPackages.join(', ')} - £${suggestedCost}`)
    setPackageCost(suggestedCost)
    setPackages(suggestedPackages)
  }

  const setIndividualOption = (day,passType) => {
    let initialOptions = selectedOptions
    initialOptions[day][passType] =!initialOptions[day][passType]
    setSelectedOptions({...initialOptions})
  }

  const clearOptions = () => {
    console.log("Options reset to: ", initialSelectedOptions)
    localStorage.removeItem("selectedOptions")
    setSelectedOptions(deepCopy(initialSelectedOptions))
  }

  useEffect(() => {
    setTotalCost(calculateTotalCost(selectedOptions,priceModel))
    selectPassCombination(individualTickets,passes)
  }, [selectedOptions,priceModel,fullPassFunction])
  
  useEffect(() => {
    if(fullPassFunction) { fullPassFunction(() => selectFullPass) }
  },[])

  useEffect(() => {
    console.log("pricingData",pricingData)
    
    // Generate item options
    const optionsGenerated = pricingData ? pricingData.reduce((obj,event) => {
      let eventObj = {}
      eventObj[event.SK] = event.individual_items.reduce((obj,item) => {
        let itemObj = {}
        itemObj[item.SK] = false
        return {...obj, ...itemObj}  
      },{})
      return {...obj, ...eventObj}
    },{}) : []
    console.log("optionsGenerated",optionsGenerated)
    setSelectedOptions(optionsGenerated)

    // Generate Passes
    const passesGenerated = pricingData ? pricingData.reduce((obj,event) => {
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
    console.log("passesGenerated",passesGenerated)
    setPasses(passesGenerated)

    const generatedIndividualTicket = pricingData ? pricingData.reduce((obj,event) => {
      let eventObj = {}
      eventObj[event.SK] = event.individual_items.reduce((obj,item) => {
        let itemObj = {}
        itemObj[item.SK] = item
        return {...obj, ...itemObj}  
      },{})
      return {...obj, ...eventObj}
    },{}) : []
    console.log("generatedIndividualTicket",generatedIndividualTicket)
    setIndividualTickets(generatedIndividualTicket)

  },[pricingData])


  // useEffect(() => {
  //   const storedOptions = localStorage.getItem("selectedOptions")
  //   if(storedOptions) { setSelectedOptions(JSON.parse(storedOptions)) }
  //   const studentDiscount = localStorage.getItem("student") === 'true'
  //   console.log("Student Discount",studentDiscount)
  //   setPriceModel(studentDiscount ? "studentCost" : "cost")
  //   setStudentDiscount(studentDiscount)
  // },[])

  function CheckoutButton() {
    const { pending } = useFormStatus();
    return (
      <button type="submit" disabled={pending} 
        className='bg-chillired-400 text-white rounded-lg py-6 px-12 hover:bg-chillired-700 text-nowrap w-full max-w-72 md:w-auto'>
        {pending ? "Checking Out..." : "Book Now"}
      </button>

    );
  }

  async function checkout() {
    localStorage.setItem("selectedOptions", JSON.stringify(selectedOptions))
    localStorage.setItem("student",priceModel === "cost" ? "false" : "true")
    router.push("/checkout") //TODO This 100% needs a check for errors
  }
  
  const cellClasses = 'border border-gray-600 text-center py-2 px-3 md:py-2 md:px-4 ';
  const headerClasses = cellClasses.replaceAll('border-gray-600','border-chillired-400')
  const toggleCellClasses = "bg-richblack-600 text-white " +  cellClasses 
  const studentDiscountAvailable = false
  
  if(error) { return <div>error</div>}
  if(isLoading) { return <div>isLoading</div>}
  
  const has_events = pricingData?.length > 0 
  if(has_events) {
    return (
      <div className="table-container w-full flex justify-center flex-col md:pt-0 max-w-full lg:mx-auto md:mx-3 col-span-5 text-xs md:text-base">
        { isValidating ? <Spinner className="flex absolute top-0"/> : null }
        <PassCards 
          passes={passes}
          individualTickets={individualTickets}
          currentSelectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          selected={packages} 
          priceModel={priceModel} 
          scrollToElement={scrollToElement} 
          shouldScroll={packages.length == 0}
          withHero={false}
          ></PassCards>
        
        { studentDiscountAvailable && <div className='mb-12'>
          <Cell option={{name: 'I am a student and will bring Student ID', cost: 0, studentCost: 0, isAvailable: true } }
            isSelected={studentDiscount} onSelect={togglePriceModel} studentDiscount={studentDiscount} />
        </div> }
        
        {/* <OptionsTable 
          headerClasses={headerClasses}
          toggleCellClasses={toggleCellClasses}
          cellClasses={cellClasses}
          selectedOptions={selectedOptions}
          clearOptions={clearOptions}
          setIndividualOption={setIndividualOption}
          priceModel={priceModel}
          locked={false}
          hidden={false}
        /> */}
        
        <div title="Checkout" className="mx-auto w-full  max-w-2xl  items-start mt-10 mb-10 rounded-lg border border-gray-900 bg-gray-50 text-richblack-700 shadow-lg">
        { priceModel === 'studentCost' && totalCost && totalCost > 0 ? (
            <div className='rounded-t-md border-t-gray-600 border border-b-0 border-l-0 border-r-0 bg-gold-500 p-2 font-bold text-center'>This is a student only ticket deal!</div>) 
          : null }
          <div className='flex flex-col md:flex-row justify-between  p-10 gap-12'>
            { totalCost && totalCost > 0 ? (
              <>
                <div className='max-w-2/3'>
                  
                  <p>{packages.length == 1 && packages[0] == fullPassName ?  "Best deal" : "Best option for you"}</p>
                  <h2 className='text-2xl'>{packages.map((packageName) => `${packageName} ${passOrTicket(packageName)}`).join(', ').replace('Saturday Dinner Ticket','Dinner Ticket')}</h2>
                  <h2 className='text-3xl font-bold'>
                    { totalCost - packageCost > 0 ? (<span className='line-through'>£{totalCost % 1 != 0 ? totalCost.toFixed(2) : totalCost}</span>) : null } {moneyString(packageCost)}
                  </h2>
                  { totalCost - packageCost > 0 ? (<p>Saving you £{(totalCost - packageCost) % 1 !=0 ?  (totalCost - packageCost).toFixed(2) : (totalCost - packageCost)} on the full cost of those options!</p>) : null }
  
                  <div className='font-bold mt-3'>Add promo codes at checkout</div>
                </div>
                <form action={checkout} className='flex w-full md:w-auto flex-col md:flex-row items-center justify-center'>
                <CheckoutButton></CheckoutButton>
                </form>
                
              </>
            ) : "Select options in the table above to see the suggested packages" }
           
          </div>
          
        </div>
        
        { process.env.NODE_ENV == 'development' && process.env.NEXT_PUBLIC_INTERNAL_DEBUG == 'true' ? <>
        <hr />
        <h2>Debug Ignore below the line</h2>
        <div className='text-xs'>
          <pre>Selected -- {JSON.stringify(selectedOptions,null,2)}</pre>
          <pre>Passes--{JSON.stringify(passes,null,2)}</pre>
          <pre>Packages--{JSON.stringify(packages,null,2)}</pre>
          <pre>PricingData--{JSON.stringify(pricingData,null,2)}</pre>
        </div>
        </> : null }
        
      </div>
    )
  } else {
    return <div className="table-container w-full flex justify-center flex-col md:pt-0 max-w-full lg:mx-auto md:mx-3 col-span-5 text-xs md:text-base">
      <div className='pb-6'>
        <h2 className='text-3xl'>No Events Currently available</h2>
        <p>Check back soon</p>
      </div>

    { process.env.NODE_ENV == 'development' && process.env.NEXT_PUBLIC_INTERNAL_DEBUG == 'true' ? <>
      <hr />
      <h2>Debug Ignore below the line</h2>
      <div className='flex'>
        <pre>Selected -- {JSON.stringify(selectedOptions,null,2)}</pre>
        <pre>Packages--{JSON.stringify(packages,null,2)}</pre>
        <pre>PricingData--{JSON.stringify(pricingData,null,2)}</pre>
      </div>
      </> : null }
    </div>
  }
  
};

export default PricingTable; 

{/*  */}
