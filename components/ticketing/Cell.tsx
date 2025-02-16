'use client'
import React from 'react';
// import './Ticketing.css';
import { Field, Label, Switch } from '@headlessui/react'

export interface ICellProps {
  option?: { 
    name: string, 
    cost: number, 
    studentCost: number, 
    isAvailable: boolean 
  }, 
  isSelected: boolean, 
  onSelect?: any,
  studentDiscount: boolean,
  day?: string
  passType?: string
  locked?: boolean
}

const Cell: React.FC<ICellProps> = (props: ICellProps) => {
  const { option,isSelected,onSelect,studentDiscount, day,passType} = props;
  const { cost, studentCost, isAvailable} = option || { cost: 0, studentCost: 0, isAvailable: true };
  const checkBoxCss = props.locked ? "bg-gray-700" : isSelected? 'bg-chillired-600' : 'bg-gray-200';
  const setValue = option && option.cost == 0 && option.studentCost == 0 
    ? {}
    : day && passType 
      ? {one: day, two: passType} 
      : day 
        ? {one: day, two: !isSelected} 
        : {one:passType, two: !isSelected} ;
  return (
      <>{isAvailable ? (
          <Field className={`flex items-center justify-center flex-col sm:flex-row ${props.locked ? 'cursor-not-allowed': ''}`}>
          <Switch
            disabled={props.locked}
            checked={isSelected}
            onClick={() => onSelect(setValue.one,setValue.two)}
            // onChange={onSelect(day,passType)}
            className={`${checkBoxCss} ${props.locked ? 'cursor-not-allowed': 'cursor-pointer'} group relative inline-flex h-6 w-11 flex-shrink-0  rounded-full border-2 border-transparent  transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-chillired-600 focus:ring-offset-2 order-2 sm:order-1`}
          >
            <span
            aria-hidden="true"
            className="${props.locked ? 'cursor-not-allowed': ''} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out group-data-[checked]:translate-x-5"
          />
          </Switch>
            
          <Label as="span" className="text-white sm:ml-3 mt-0 mb-2 sm:mt-3 order-1 sm:order-2">
            {/* <span className="font-medium text-white">{name}</span>{' '} */}
            { cost || studentCost ? (<span className="text-white">£{studentDiscount ? (studentCost %1 !=0 ? studentCost.toFixed(2): studentCost) : (cost % 1 !=0 ? cost.toFixed(2) : cost) }</span>) : null }
            { JSON.stringify(setValue) == "{}" ? (
              <span className="text-white">{option.name}</span>
            ) : null }
            {/* {JSON.stringify(props, null, 2)} */}
          </Label>
        </Field>
      ) : null}
      </>
  );
};

export default Cell;