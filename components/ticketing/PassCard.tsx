import React from 'react';
import { fullPassName } from './pricingDefaults';
import { moneyString } from '../../lib/useful'
import { format, fromUnixTime } from "date-fns";
import { BiRightArrowAlt } from "react-icons/bi";


export const PassCard = ({passName, clickFunction, pass, priceModel, hasASaving, selected, included, basic, locked, hero= false}:
  {passName:string, clickFunction:any, pass:any, priceModel:string, hasASaving:boolean, selected:boolean, included?:boolean, basic?:boolean, locked?:boolean, hero?:boolean}
) => {
  const cardWidthClasses = passName === fullPassName && hero ? 'col-span-full' : basic ? 'flex-col': 'md:flex-col'
  const passPadding = basic ? 'p-4 md:p-4' : 'p-6 md:p-10'
  const titleTextSize = basic ? 'text-sm md:text-sm' : 'text-xl md:text-2xl'
  // const baseTextSize = basic ? 'text-sm md:text-sm' : 'text-xl md:text-base'
  const priceTextSize = basic ? 'text-sm md:text-sm leading-7' : 'text-2xl md:text-2xl'
  const hoverClasses = locked ? 'hover:border-richblack-500 cursor-not-allowed' : 
    selected ? "border-white cursor-pointer" : 
    included ? 'hover:border-richblack-500 cursor-not-allowed' : 'hover:border-white cursor-pointer'
  const eventDateString = pass?.event?.start_time ? format(fromUnixTime(pass.event.start_time),'EEEE do MMMM, h:mmaaa'): null
  const prebookTicket = /prebook/.test(pass.slug) ? true : false
  const passImage = pass.slug == 'february-prebook' ? "url('/uploads/jery-manoli-andreas.png')" 
    : pass.slug == 'march-prebook' ? "url('/uploads/jeydikson-andreas.png')" 
    : pass.slug == 'april-prebook' ? "url('/uploads/andreas-flower.png')" 
    : pass.slug == 'may-prebook' ? "url('/uploads/andreas-tropical.png')" 
    : ''
  const offSale = ((pass.event.start_time*1000) - (1000*60*60*2)) < Date.now()
  return (
    <div
      onClick={locked || offSale ? ()=>{console.log('locked')} : clickFunction}
      key={passName}
      title={passName}
      className={`relative flex flex-col justify-between rounded-3xl bg-richblack-600 ${passPadding} shadow-xl 
      ring-1 ring-gray-900/10  text-white border border-richblack-500 ${hoverClasses} ${cardWidthClasses}`}
      style={{backgroundImage: passImage, backgroundPositionX: '100%', backgroundPositionY: '100%', backgroundSize: '250px', backgroundRepeat: 'no-repeat'}}
    >
      <div className={`grid grid-cols-5 gap-2 md:flex flex-wrap md:flex-nowrap md:justify-between h-full w-full ${cardWidthClasses}`}>

        <div className='col-span-3'>
          {eventDateString ? <p>{eventDateString}</p> : null }
          <h3 id={passName} className={`${titleTextSize} leading-7 text-rebelred-600 font-black uppercase w-full md:w-auto col-span-2 m-h-12`}>
            {pass.name}
          </h3>
          

          {basic ? null : 
            <div className='mt-3'>
              {pass.description.split("\n").map((line,idx)=>{ return <p key={`desc-line-${idx}`} className="mt-0 text-sm md:text-base leading-7 col-span-3 text-white">{line}</p>}) }
            </div>
          }

        </div>
        

        <div className={`flex ${ basic ? "flex-row justify-end": "flex-col justify-stretch" } items-baseline gap-x-2 place-content-center md:place-content-start col-start-4 col-span-2`}>
          <span className={`${priceTextSize} font-bold tracking-tight leading-none text-white text-right sm:text-left`}>
            {prebookTicket ? <span><span className='text-sm'>Join the <strong><em>Rebel</em></strong></span><br/> PRIORITY LIST</span>: moneyString(pass[priceModel])}
          </span>
          {hasASaving && !basic? (
          <div className="mt-0 flex items-baseline w-full gap-x-2 place-content-end	md:place-content-start ">
            <span className="text-base font-semibold text-gold-500 text-right leading-none">
            Save £{priceModel == "studentCost" ? (pass.studentSaving % 1 != 0 ? pass.studentSaving.toFixed(2) : pass.studentSaving) : (pass.saving % 1 != 0 ? pass.saving.toFixed(2) : pass.saving)}{included ? " included" : " on entry"}  
            </span>
          </div>
        ) : null}
        </div>
        
        
        
      </div>

      <button 
          className={`relative flex w-56 mt-6 items-center px-7 py-3 font-semibold text-lg transition duration-150 ease-out  rounded-lg transform focus:shadow-outline focus:outline-none focus:ring-2 ring-offset-current ring-offset-2 whitespace-nowrap text-white bg-white hover:bg-gray-50 bg-gradient-to-r from-rebelred-400 to-rebelred-600 hover:to-rebelred-700`}
        >
          Select this option
          
            <BiRightArrowAlt
              className={`ml-1 -mr-1 w-6 h-6 opacity-80`}
            />
         
        </button>
      { offSale ? <div className={`w-full h-full opacity-90 bg-richblack-700 absolute left-0 top-0 rounded-3xl flex flex-col items-center justify-center ${passPadding}`}>
                <h2 className='font-bold text-3xl leading-tight'>Priority Closed</h2>
              <p>Sorry priority list is now closed</p>
        </div> : null }

      { selected ? 
          basic ? <div className='w-full h-full opacity-90 bg-richblack-700 absolute left-0 top-0 rounded-3xl flex flex-col items-center justify-center'>Selected</div> 
            : <div className={`w-full h-full opacity-90 bg-richblack-700 absolute left-0 top-0 rounded-3xl flex flex-col items-center justify-center ${passPadding}`}>
                <h2 className='font-bold text-3xl leading-tight'>Currently Selected</h2>
              <p>This is the best deal for your choices</p>
        </div> : null }

        { !selected && included ? 
          basic ? <div className='w-full h-full opacity-95 bg-richblack-700 absolute left-0 top-0 rounded-3xl flex flex-col items-center justify-center'>Included</div> 
            : <div className={`w-full h-full opacity-95 bg-richblack-700 absolute left-0 top-0 rounded-3xl flex flex-col items-center justify-center ${passPadding}`}>
                <h2 className='font-bold text-gray-400 text-3xl'>Included</h2>
              <p className='text-gray-500'>This item is included in your selection</p>
        </div> : null }

        
    </div>
  );
};