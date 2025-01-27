// import { CheckIcon } from '@heroicons/react/20/solid'
import { fullPassName, passes} from './pricingDefaults'
import { PassCard } from './PassCard';
import { itemsFromPassCombination, itemListToOptions, addToOptions, passInCombination, optionsToPassArray} from './pricingUtilities'
import type { PartialSelectedOptions } from './pricingTypes'

// export default function PassCards({setDayPass,setTypePass,setDinnerPass,priceModel,scrollToElement,selectFullPass,selected,shouldScroll}) {
export default function PassCards({currentSelectedOptions, setSelectedOptions, priceModel,scrollToElement,selected,shouldScroll, basic, locked, withHero = true} :
  { currentSelectedOptions:PartialSelectedOptions, 
    setSelectedOptions:any, 
    priceModel: string,
    scrollToElement:any,
    selected:any,
    shouldScroll:boolean, 
    basic?:boolean
    locked?:boolean,
    withHero?:boolean
  }
) {

  const clickFunctionFromPassName = (passName:string,setTo:boolean) => {
    let initialOptions = currentSelectedOptions
    const itemsInPassName = itemsFromPassCombination([passName]) as string[]
    setSelectedOptions(addToOptions(initialOptions,itemListToOptions(itemsInPassName,setTo)))
    shouldScroll && scrollToElement()
  }  
  const passesAvailable = Object.keys(passes).filter((item) => passes[item].isAvailable)
  const passToDisplay = withHero ? passesAvailable.filter((item)=>item !== fullPassName) : passesAvailable
  const numPasses = passToDisplay.length
  const columns = numPasses > 4 ? 4 : numPasses
  const lgColumnClasses = columns == 4 ? "lg:grid-cols-4" : columns == 3 ? "lg:grid-cols-3" : columns == 2 ? "lg:grid-cols-2" : "lg:grid-cols-1"
  const mdColumnClasses = columns >= 3 ? "md:grid-cols-3" : columns == 2 ? "lg:grid-cols-2" : "lg:grid-cols-1"
  const dynamicColClasses = basic ? 'grid-cols-1 xs:grid-cols-2' : `grid-cols-1 ${mdColumnClasses} ${lgColumnClasses}`

  return (
    <div className="isolate overflow-hidden ">
      <div className='mb-6'>
      { basic || !withHero ? null : <>
        <h1 className='text-4xl font-bold'>Pass options</h1> 
        <p>Select your pass below or tick the items you want and we&#39;ll work it out for you</p>
      </>}
        
      </div>
      <div className={`mx-auto grid max-w-full  ${basic ? "gap-2": "gap-8"} lg:max-w-full mb-12 ${dynamicColClasses}`}>

      
      {withHero ? <PassCard passName={fullPassName} basic={basic} locked={locked} clickFunction={() => { 
        clickFunctionFromPassName(fullPassName,!selected.includes(fullPassName))
        }} pass={passes[fullPassName]} priceModel={priceModel} hasASaving={true} selected={selected.includes(fullPassName)} hero={true}></PassCard> : null }

        {passToDisplay.map((passName) => {
          const pass = passes[passName]
          const hasSaving = priceModel == 'studentCost' ? pass.studentSaving > 0 : pass.saving > 0

          // console.log("selected",selected)
          // console.log("pass combination",pass.combination)
          const included = passInCombination(pass,optionsToPassArray(currentSelectedOptions))

          // console.log("include",included)
          const clickFunction = () => clickFunctionFromPassName(passName,!selected.includes(passName))
          return (<PassCard key={passName} 
            basic={basic} passName={passName} pass={pass}
            clickFunction={clickFunction}  priceModel={priceModel} hasASaving={hasSaving} 
            selected={selected.includes(passName)}
            included={included}
            locked={locked}
            />)
        })}
        
      </div>
       
    </div>
  )
}
