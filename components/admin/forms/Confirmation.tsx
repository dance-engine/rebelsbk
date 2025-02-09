const Confirmation = ({field,onChange,currentValue}) => {
return <div className="mb-1">
  <span>{field.label}</span>
  <div className="flex gap-3">
    <span className="mr-3"><input id={`${field.name}-yes`} name={field.name} type="radio" value={"true"} defaultChecked={currentValue == 'true'} onChange={(e) => { onChange(e) }} className="mr-1"/> <label htmlFor={`${field.name}-yes`}>yes</label></span>
    <span className="mr-3"><input id={`${field.name}-no`} name={field.name} type="radio" value={"false"} defaultChecked={currentValue == 'false'} onChange={(e) => { onChange(e) }} className="mr-1"/> <label htmlFor={`${field.name}-no`}>no</label></span>
  </div>
  {field.error ? <p id={`${field.name}-error`} className="mt-2 text-sm text-red-600">Not a valid email address.</p> : null }
  
</div>
}

export default Confirmation