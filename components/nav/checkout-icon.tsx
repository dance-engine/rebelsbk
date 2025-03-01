'use client'
import {Icon} from "../icon"
import Link from "next/link";
import { useState, useEffect } from "react";

const countCart = (cart) => {
  console.log("count",cart)
  return cart ? 
    Object.keys(cart).reduce((total, day) => {
      console.log("outer",total)
      return total + Object.keys(cart[day]).reduce((total, typeOfthing) => {
        console.log("inner",day,total,typeOfthing)
        return total += cart[day][typeOfthing] ? 1 : 0 ;
      }, 0)
    }, 0)
  : false
}

export const CartIcon = () => {
  
  const [cart] = useState(() => {
    // getting stored value
    // const saved = ?  : JSON.stringify(false)
    const initialValue =  typeof window!== "undefined" ? JSON.parse(localStorage.getItem("selectedOptions")) : 0;
    return initialValue || 0;
  });

  useEffect(() => {
    if (typeof window!== "undefined") {
      JSON.parse(localStorage.getItem("selectedOptions"))
    }
  }, [cart]); 

  return cart ? (
    <Link href="/checkout" suppressHydrationWarning
      className={`relative select-none hover:text-gold-400 text-base inline-block tracking-wide transition duration-150 ease-out hover:opacity-100 py-7 px-1 lg:px-2 whitespace-nowrap`}
    >
      <span suppressHydrationWarning className="sr-only">Checkout</span>
      <Icon data={{name: "BiCartAlt", color: "white", style: "regular", size: "medium"}} className="w-8 h-8"></Icon>
      <span suppressHydrationWarning className="absolute right-0 bottom-1/2 rounded-full bg-chillired-700 w-6 h-6 flex items-center justify-center"  >{countCart(cart)}</span>
    </Link>
  ) : null
 }