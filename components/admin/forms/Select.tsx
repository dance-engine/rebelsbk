// import { useState, useEffect } from "react"

const Select = ({field,onChange,initialValue}) => {
  return <div className="mt-3">
    <label htmlFor={field.name} className="block">{field.label}</label>
    <select name={field.name} id={field.name} className="text-black rounded-md shadow-sm" defaultValue={initialValue} onChange={(e) => { onChange(e.currentTarget.value) }}>
      <option value="not-set">--</option>
      { field.options.map((opt,idx)=>{
        return <option key={`${field.name}-${idx}`} value={opt}>{opt}</option>
      })}
    </select>
  </div>
}

export default Select