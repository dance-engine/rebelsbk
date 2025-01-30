export const deepCopy = (object: any) => {
  return JSON.parse(JSON.stringify(object))
}

export const guaranteeISOstringFromDate = (date: string | number) => {
  return isNaN(Date.parse(date as string)) 
    ? new Date(parseInt(date as string) * 1000).toISOString() 
    : new Date(Date.parse(date as string))
}

export const guaranteeTimestampFromDate = (date: string | number) => {
  return isNaN(Date.parse(date as string)) 
    ? parseInt(date as string) * 1000
    : Date.parse(date as string)
}

export const moneyString = (amount: number) => {
  const decimal_amount = amount % 1 != 0 ? amount.toFixed(2) : amount
  // const decimal_amount = (Math.round(amount * 100) / 100).toFixed(2)
  return amount <= 0 ? "FREE" : `£${decimal_amount}`
}