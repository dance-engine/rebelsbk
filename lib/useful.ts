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
  const inPounds = amount / 100
  const decimal_amount = inPounds % 1 != 0 ? inPounds.toFixed(2) : inPounds
  // const decimal_amount = (Math.round(amount * 100) / 100).toFixed(2)
  return amount <= 0 ? "FREE" : `£${decimal_amount}`
}