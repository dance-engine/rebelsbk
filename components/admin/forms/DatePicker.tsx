import { useState, useEffect } from "react"
import { format, eachMonthOfInterval, eachYearOfInterval} from "date-fns"

const DatePicker = ({field,onChange,initialValue}) => {
  const [year,setYear] = useState(initialValue?.split('-')[0] || 2025)
  const [month,setMonth] = useState(initialValue?.split('-')[1] || 1)
  const [day,_setDay] = useState(initialValue?.split('-')[2] || 1)

  useEffect(() => {
    onChange(`${year}-${month}-${day}`)
  },[year,month,day])

  const months = eachMonthOfInterval({
    start: new Date(2024, 12, 31),
    end: new Date(2025, 11, 1)
  }).map((date)=>{return [format(date,'MMM'),format(date,'M')]})
  const years = eachYearOfInterval({
    start: new Date(1960, 12, 31),
    end: new Date(2024, 12, 31)
  }).map((date)=>{return format(date,'yyyy')}).reverse()

  return <div className="mt-3">
    <span>{field.label}</span>
    <div className="flex gap-3">
      <select name="month" id="month" className="text-black rounded-md shadow-sm" defaultValue={month} onChange={(e) => { setMonth(e.currentTarget.value) }}>
        { months.map((mnth)=>{
          return <option key={`month-${mnth[1]}`} value={mnth[1]}>{mnth[0]}</option>
        })}
      </select>

      <select name="year" id="year" className="text-black rounded-md shadow-sm" defaultValue={year} onChange={(e) => { setYear(e.currentTarget.value) }}>
        { years.map((year)=>{
          return <option key={`year-${year}`} value={year} >{year}</option>
        })}
      </select>
      {/* {year}-{month}-{day} */}
      {/* {JSON.stringify(months)} */}
    </div>
    {field.error ? <p id={`${field.name}-error`} className="mt-2 text-sm text-red-600">Not a valid email address.</p> : null }
    
  </div>
  }
  
  export default DatePicker