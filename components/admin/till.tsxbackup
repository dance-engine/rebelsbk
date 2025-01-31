'use client'
import React, { useState, useEffect } from 'react';
import { useFormStatus } from "react-dom"
import { BiAlarmAdd  } from 'react-icons/bi';
import Cell from '../ticketing/Cell';
import { initialSelectedOptions, fullPassName, passes, individualTickets } from '../ticketing/pricingDefaults'
import { calculateTotalCost, passOrTicket, getBestCombination, itemsFromPassCombination, itemListToOptions, addToOptions, mapItemsToAccessArray} from '../ticketing/pricingUtilities'
import PassCards from '../ticketing/passes'
import { OptionsTable } from '../ticketing/OptionsTable';
import ScanSuccessDialog from '@components/admin/scan/ScanSuccessDialog'
// import { useRouter } from 'next/navigation'
import { deepCopy } from '@lib/useful'
import { format, getUnixTime } from 'date-fns';
import Pusher from 'pusher-js';
import symmetricDifference from 'set.prototype.symmetricdifference'
import difference from 'set.prototype.difference'
symmetricDifference.shim();
difference.shim();

const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY, { cluster: 'eu',  });

const Till = ({fullPassFunction,scrollToElement}:{fullPassFunction?:Function,scrollToElement?:Function}) => {
  const [selectedOptions, setSelectedOptions] = useState(deepCopy(initialSelectedOptions));
  const [studentDiscount, setStudentDiscount] = useState(false);
  const [priceModel, setPriceModel] = useState("cost")
  const [totalCost, setTotalCost] = useState(0);
  const [packages,setPackages] = useState([])
  const [packageCost, setPackageCost] = useState(0)
  const [till, setTill] = useState(null)
  const [locked, setLocked] = useState(false)
  const [channel, setChannel] = useState(null)
  const [cardPayment, setCardPayment] = useState(null)
  const [payments,setPayments] = useState([] as any[])
  const [ticket,setTicket] = useState(false as any)
  const [selectedAccessArray, setSelectedAccessArray] = useState([])

  const tillColours = {
    TILL1: "bg-chillired-500 text-white",
    TILL2: "bg-blue-400 text-white",
    TILL3: "bg-gold-400 text-black",
  }

  // const router = useRouter()

  const togglePriceModel = () => {
    setPriceModel(priceModel === "cost"? "studentCost" : "cost")
    setStudentDiscount(priceModel === "cost" ? true : false) //! This looks backwards but priceModel hasn't changed yet
  }

  const selectFullPass = (setTo) => {
    let initialOptions = selectedOptions
    const itemsInPassName = itemsFromPassCombination([fullPassName]) as string[]
    setSelectedOptions(addToOptions(initialOptions,itemListToOptions(itemsInPassName,setTo)))
  }

  const selectPassCombination = () => {
    const {price: suggestedCost, options: suggestedPackages} = getBestCombination(selectedOptions,priceModel)
    console.log(`Suggested packages: ${suggestedPackages.join(', ')} - £${suggestedCost}`)
    setPackageCost(suggestedCost)
    setPackages(suggestedPackages)

    //! Connor's suggestion + Adam's ammends
    const combinedPackages = suggestedPackages.flatMap((pass)=>{
      return passes[pass]?.combination ? passes[pass].combination : []
    })
    const selectedStrings = Object.keys(selectedOptions).flatMap((day) => {
      return Object.keys(selectedOptions[day]).flatMap((option) => {
        return selectedOptions[day][option] ? `${day} ${option}` : []
      })
    })
    // append the access array from combinedPackages and selectedStrings, ignoring duplicates for now it is handled in function
    const accessArray = mapItemsToAccessArray([...combinedPackages, ...selectedStrings])
    setSelectedAccessArray(accessArray)
    console.log([...combinedPackages, ...selectedStrings])
    console.log(selectedAccessArray)
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
    setLocked(false)
    setCardPayment(false)
  }

  useEffect(() => {
    setTotalCost(calculateTotalCost(selectedOptions,priceModel))
    selectPassCombination()
  }, [selectedOptions,priceModel,fullPassFunction])
  
  useEffect(() => {
    if(fullPassFunction) { fullPassFunction(() => selectFullPass) }
    setChannel(pusher.subscribe('card-payments'))
    return () => {
      pusher.unsubscribe('card-payments')
    }
  },[])

  useEffect(() => {
    if(till) {
      console.log("Connected to ",till)
      channel.bind(till, function(data) {
        console.log("pusher",data)
        // const products = data.products.filter((product)=> product.till == till ).map((product) => product.name)
        // const itemsInPassName = itemsFromPassCombination(products) as string[]
        // console.log("products",products)
        // console.log("itemsInPassName",itemsInPassName)
        // setSelectedOptions(itemListToOptions(itemsInPassName,true))
        // setLocked(true)
        setCardPayment(data)
      }); 
      channel.bind("all", (payment) => {
        setPayments((prevPayments) => [payment,...prevPayments])
      })
    }
  },[till])

  // const addPayment = 

  const changeTill = (till) => {
    if(till) { channel.unbind(till) }
    setTill(till)
  }

  function CheckoutButtons({allgood}:{allgood?:boolean}) {
    const positiveState = allgood ? true : false
    const { pending } = useFormStatus();
    const activeButtonClass = `disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg py-3 px-8 \
    ${ positiveState ? "bg-green-700 hover:bg-green-800" : "bg-chillired-600 hover: bg-chillired-400" } text-xl text-nowrap w-full max-w-72 md:w-auto`
    return(
      <div className='flex gap-6'>
        <button type="submit" name="checkout-button" id="checkout-button" value="cash" disabled={pending || cardPayment || totalCost <= 0} 
          className={activeButtonClass}>
          {pending ? "Storing..." : "Cash"}
        </button>
        <button type="submit" name="checkout-button" id="checkout-button" value="card" disabled={pending || !cardPayment || totalCost <= 0} 
        className={activeButtonClass}>
        {pending ? "Storing..." : "Card"}
      </button>  
      </div>
      
    );
  }

  async function checkout(formObject) {
    
    setSelectedOptions(deepCopy(initialSelectedOptions))
    setStudentDiscount(false)

    // Generate line items for each pass/ticket
    const line_items = packages.map(passName => {
      const line_item = passes[passName] ? passes[passName] : individualTickets[passName.split(" ")[0]][passName.split(" ")[1]]
      if (line_item) {
        return {
          'amount_total': formObject.get("inperson-amount"),  //studentDiscount ? line_item.cost * 100 : line_item.studentCost * 100,
          'description': passName,
          'price_id': studentDiscount ? line_item.studentPriceId : line_item.priceId,
        }
      } else {
        return { 'amount_total': 0, 'description': passName, 'price_id': "broken", }
      }
    })
    // Record the sale
    console.log("selectedOptions",selectedOptions)
    const purchaseObj = {
      'email': formObject.get("inperson-email"),       
      'full_name': formObject.get("inperson-name"),
      'purchase_date': getUnixTime(new Date()) ,
      'line_items': line_items,
      'access': selectedAccessArray, //! use selectedAccessArray instead
      'status': `paid_${formObject.get('checkout-button')}`,
      'student_ticket': studentDiscount,
    //   // 'promo_code': None|{
    //   //     'code': "MLF",
    //   //     'value': 500
    //   // },
    //  // 'meal_preferences': None|{},
      'checkout_session': formObject.get("inperson-payment-ref") || formObject.get('checkout-button'), 
      'checkout_amount': formObject.get("inperson-payment-amount") || packageCost*100, 
      'heading_message':"THANK YOU FOR YOUR PURCHASE",
      'send_standard_ticket': true,
    }
    console.log("Purchase object",purchaseObj)
    const apiResponse = await fetch('/api/admin/epos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchaseObj),
    })
    const apiData = await apiResponse.json() 
    const apiAmmendedData = apiResponse.ok ? apiData : {...apiData, ticket_number: false }
    console.log("apiData",apiAmmendedData)
    setTicket(apiData.ticket_number)
    if(!apiResponse.ok) {
      alert(`PROBLEM, ${JSON.stringify(apiData)} ${apiResponse.status}`)
    }
    // router.push("/admin/epos") //TODO This 100% needs a check for errors
    // Should reset the thing and unlock the form
    setLocked(false)
  }
  
  const cellClasses = 'border border-gray-600 text-center py-2 px-3 md:py-2 md:px-4 ';
  const headerClasses = cellClasses.replaceAll('border-gray-600','border-chillired-400')
  const toggleCellClasses = "bg-richblack-600 text-white " +  cellClasses 
  const inputClasses = "w-full mb-3 rounded-md border border-gray-600 p-2 bg-gray-50 text-gray-900 w-full\
    focus:border-chillired-400 focus:ring-chillired-400"

  const displayAmount = cardPayment ? (cardPayment.amount/100).toFixed(2) : 0
  const correctAmount = cardPayment ? displayAmount == packageCost.toFixed(2) ? true : false : true
   
  return till ?(
    <div className="table-container w-full grid max-w-full lg:mx-auto col-span-5
    grid-cols-1 gap-3 justify-center text-xs 
    md:grid-cols-4  md:pt-12 md:mx-3 md:text-base
      ">
        { ticket ? <div className='fixed z-50 w-full'><ScanSuccessDialog scan={ticket} onClick={()=>{setTicket(false); console.log("Checkin")}}/></div> : null }
      <h1 className={`${tillColours[till]} col-span-3 md:col-span-full block font-bold text-xl p-3 mt-2 rounded-lg`}>{till}</h1>
      <div className='col-span-1'>
        <PassCards 
          currentSelectedOptions={selectedOptions}
          setSelectedOptions={setSelectedOptions}
          selected={packages} 
          priceModel={priceModel} 
          scrollToElement={scrollToElement} 
          shouldScroll={false}
          basic={true}
          locked={locked}
          ></PassCards>
        
        <div className='mb-12'>
          <Cell option={{name: 'Student Ticket (Check Student ID)', cost: 0, studentCost: 0, isAvailable: true } }
            isSelected={studentDiscount} onSelect={togglePriceModel} studentDiscount={studentDiscount} locked={locked}/>
        </div>
      </div>
      
      <div className="col-span-3">
      <OptionsTable headerClasses={headerClasses}
        toggleCellClasses={toggleCellClasses}
        cellClasses={cellClasses}
        selectedOptions={selectedOptions}
        clearOptions={clearOptions}
        setIndividualOption={setIndividualOption}
        priceModel={priceModel} 
        locked={locked}
      />
      
      <div className="mx-auto w-full  max-w-2xl  items-start mt-10 mb-10 rounded-lg border border-gray-900 bg-gray-50 text-richblack-700 shadow-lg">
      
      { priceModel === 'studentCost' && totalCost && totalCost > 0 ? (
          <div className='rounded-t-md border-t-gray-600 border border-b-0 border-l-0 border-r-0 bg-gold-500 p-2 font-bold text-center'>This is a student only ticket deal!</div>) 
        : null }

        {cardPayment ? <div className={`w-full col-span-3 md:col-span-full ${correctAmount ? "bg-green-900" : "bg-chillired-400"} text-white rounded px-6 py-3`}>
          <p className='w-full'>
            {correctAmount ? "PAYMENT SUCCESSFUL add details" : `ERROR cost is £${totalCost}`} -
            Card Payment £{displayAmount}
          </p>
        </div> : null}

        <div className='flex flex-col md:flex-row justify-between pb-10 px-10 pt-6 gap-3'>
          { cardPayment || (totalCost && totalCost > 0) ? (
            <>
              <div className='max-w-2/3 md:w-1/3'>
                <h2 className='text-xl leading-none'>{packages.map((packageName) => `${packageName} ${passOrTicket(packageName)}`).join(', ').replace('Saturday Dinner Ticket','Dinner Ticket')}</h2>
                <h2 className='text-3xl font-bold'>{ totalCost - packageCost > 0 ? (<span className='line-through'>£{totalCost}</span>) : null } £{packageCost}</h2>              
              </div>
              <form autoComplete="off" action={checkout} className='flex w-full md:w-2/3 flex-col items-center justify-center'>
                { cardPayment ? <input type="text" autoComplete="off" name="inperson-payment-ref" readOnly value={cardPayment.payment_ref} className={inputClasses} /> : null }
                <input type="text" autoComplete="off" name="inperson-amount" placeholder="Money" readOnly={cardPayment ? true : false } defaultValue={cardPayment ? cardPayment.amount : packageCost*100} className={inputClasses} />
                <input type="text" autoComplete="off" name="inperson-name" placeholder="Name" className={inputClasses} />
                <input type="text" autoComplete="off" name="inperson-email" placeholder="Email" className={inputClasses}   />
                <CheckoutButtons allgood={correctAmount}></CheckoutButtons>
              </form>
              
            </>
          ) : "Select options in the table above to see the suggested packages" }
        </div>

        
      </div>
      <div>
        <h2>Recent Payments</h2>
          {payments.slice(0,10).map((payment,index) => { return (
          <div key={`${payment.payment_ref}=${index}`} 
            className='rounded bg-gray-500 border border-gray-400 p-2 my-2 flex'
            onClick={()=> { 
              cardPayment?.payment_ref && cardPayment.payment_ref == payment.payment_ref ? setCardPayment(false) : setCardPayment(payment)
            }}>
            <BiAlarmAdd className='w-6 h-6'/>
            £{(payment.amount/100).toFixed(2)} : {payment.tills.join(',')} : {format(payment.created,'HH:mm:ss')} {payment.payment_ref}

          </div>
        )})}
        {/* {JSON.stringify(payments,null,2)} */}
      </div>

      </div>
      
      
      

      { process.env.NODE_ENV == 'development' && process.env.NEXT_PUBLIC_INTERNAL_DEBUG == 'true' ? 
        <div className='col-span-full'>
        <hr />
        <h2>Debug Ignore below the line</h2>
        <div className='flex'>
          <pre>Selected -- {JSON.stringify(selectedOptions,null,2)}</pre>
          <pre>Packages--{JSON.stringify(packages,null,2)}</pre>
        </div>
        </div> : null }      
      
    </div>
  ) : <div>
      <h2 className='text-xl flex justify-center'>Select Till</h2>
      <div className='flex justify-center flex-wrap gap-3 mx-auto'>
      <button onClick={()=>{ changeTill('TILL1')}} className={`${tillColours['TILL1']} text-5xl rounded-md px-6 py-3`}>Till 1</button>
      <button onClick={()=>{ changeTill('TILL2')}} className={`${tillColours['TILL2']} text-5xl rounded-md px-6 py-3`}>Till 2</button>
      <button onClick={()=>{ changeTill('TILL3')}} className={`${tillColours['TILL3']} text-5xl rounded-md px-6 py-3`}>Till 3</button>
      {/* <button onClick={()=>{ changeTill('purchase')}} className='rounded-md bg-chillired-500 px-6 py-3'>All Purchases</button> */}
      </div>
      
    </div>
};

export default Till; 
