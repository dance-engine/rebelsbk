"use client";
import React, { useState, useRef } from 'react';
import { TinaMarkdown } from "tinacms/dist/rich-text";
import type { Template } from "tinacms";
import { PageBlocksPricing } from "@tina/__generated__/types";
import { tinaField } from "tinacms/dist/react";
import PricingTable from "../ticketing/PricingTable";
import { Section } from "../layout/section";
import { Container } from "../layout/container";
import { Actions } from "./actions";
// import { fullPassName } from '../ticketing/pricingDefaults'


export const Pricing = ({ data }: { data: PageBlocksPricing }) => {
  const [setFullPassSelectFunction] = useState(() => (setTo)=>{console.log("fullPassSelectFunction not set",setTo)})
  const packagesSuggestorRef = useRef(null);
  const scrollToElement = () => {
    if (packagesSuggestorRef.current) {
      setTimeout(() => {
        const bottom = packagesSuggestorRef.current.getBoundingClientRect().bottom
        window && window.scrollBy({
          top: bottom -699 ,
          behavior : "smooth"
        })
      },100)
      
    } else {
      console.log("packagesSuggestorRef not set");
    }
  };
  // const packages = []
  const headlineColorClasses = {
    blue: "from-blue-400 to-blue-600",
    teal: "from-teal-400 to-teal-600",
    green: "from-green-400 to-green-600",
    red: "from-red-400 to-red-600",
    pink: "from-pink-400 to-pink-600",
    purple: "from-purple-400 to-purple-600",
    orange: "from-orange-300 to-orange-600",
    yellow: "from-yellow-400 to-yellow-600",
    transparent: "from-white to-gray-200"
  };

  return (
    <>
    <Section color={data.color} backgroundImage={data.backgroundimage}>
      <Container
        size="top"
        className="grid grid-cols-1 md:grid-cols-5 gap-0 md:gap-14 items-start justify-center"
      >
        <div className="row-start-2 md:row-start-1 md:col-span-5 text-center md:text-left ">
          {data.tagline && (
            <h2
              data-tina-field={tinaField(data, "tagline")}
              className="relative px-3 py-1 mb-8 text-md font-bold tracking-wide title-font z-20 inline-block"
            >
              {data.tagline}
              <span className="absolute w-full h-full left-0 top-0 rounded-full -z-1 bg-current opacity-7"></span>
            </h2>
          )}
          {data.headline && (
            <h3
              data-tina-field={tinaField(data, "headline")}
              className={`w-full relative mb-4 md:mb-10 text-3xl md:text-5xl font-extrabold tracking-normal leading-tight title-font`}
            >
              <span
                className={`bg-clip-text text-transparent bg-gradient-to-r  ${
                  data.color === "primary"
                    ? `from-white to-gray-100`
                    : headlineColorClasses[data.color]
                }`}
              >
                {data.headline}
              </span>
            </h3>
          )}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex flex-col md:w-1/2">
              {data.text && data.text.children && data.text.children.length > 0 &&  (
                <div
                  data-tina-field={tinaField(data, "text")}
                  className={`prose md:prose-lg mx-auto md:mx-0 mb-10 z-10 ${
                    data.color === "primary"
                      ? `prose-primary`
                      : `dark:prose-dark`
                  }`}
                >
                  <TinaMarkdown content={data.text} /> 
                </div>
              )}

              {data.actions && (
                <div className="mt-10">
                  <Actions
                    className="justify-center md:justify-start py-2"
                    parentColor={data.color}
                    actions={data.actions}
                  />
                </div>
              )}
            </div>

            {/* <div className='rounded-3xl md:w-full max-w-lg mx-auto mb-6 md:mb-12 bg-richblack-600 border-gray-700 border text-white p-8 text-center z-30'>
              <h2 className='text-2xl md:text-3xl font-bold'>Limited time deal</h2>
              <p className=''>
                Currently we are offering an early bird price at an incredible saving <br/>
                <button className={ `${packages.length == 1 && packages[0] == fullPassName ? "text-chillired-500" : "text-white bg-chillired-500 0"} text-xl border border-chillired-500 rounded-md p-6 mt-6 z-30`} 
                  onClick={() => {fullPassSelectFunction(true); scrollToElement(); }}>
                  { packages.length == 1 && packages[0] == fullPassName ? `Already selected` : `Give me the ${fullPassName}`}
                </button>
              </p>
            
            </div> */}
            
          </div>
          {data.text2 && data.text2.children && data.text2.children.length > 0 && (
            <div
              data-tina-field={tinaField(data, "text2")}
              className={`prose prose-lg mx-auto md:mx-0 mb-10 ${
                data.color === "primary" ? `prose-primary` : `dark:prose-dark`
              }`}
            >
              <TinaMarkdown content={data.text2}/> {JSON.stringify(data.text2)}
            </div>
          )}
        </div>
      </Container>
    </Section>
    <Section color={data.color} backgroundImage={data.backgroundimage}>
      <Container size='custom' width="huge">
        <div ref={packagesSuggestorRef}>
          <PricingTable fullPassFunction={setFullPassSelectFunction} scrollToElement={scrollToElement}></PricingTable>
        </div>
      </Container>
    </Section>
    </>
    
  );
};

export const pricingBlockSchema: Template = {
  name: "pricing",
  label: "Pricing",
  ui: {
    previewSrc: "/blocks/pricing.png",
    defaultItem: {
      tagline: "Here's some text above the other text",
      headline: "This Big Text is Totally Awesome",
      text: "Phasellus scelerisque, libero eu finibus rutrum, risus risus accumsan libero, nec molestie urna dui a leo.",
    },
  },
  fields: [
    {
      type: "string",
      label: "Tagline",
      name: "tagline",
    },
    {
      type: "string",
      label: "Headline",
      name: "headline",
    },
    {
      label: "Text-1",
      name: "text",
      type: "rich-text",
    },
    {
      type: "rich-text",
      label: "Text-2",
      name: "text2",
    },
    {
      label: "Actions",
      name: "actions",
      type: "object",
      list: true,
      ui: {
        defaultItem: {
          label: "Action Label",
          type: "button",
          icon: true,
          link: "/",
        },
        itemProps: (item) => ({ label: item.label }),
      },
      fields: [
        {
          label: "Label",
          name: "label",
          type: "string",
        },
        {
          label: "Type",
          name: "type",
          type: "string",
          options: [
            { label: "Button", value: "button" },
            { label: "Link", value: "link" },
          ],
        },
        {
          label: "Icon",
          name: "icon",
          type: "boolean",
        },
        {
          label: "Link",
          name: "link",
          type: "string",
        },
      ],
    },
    {
      type: "image",
      label: "Background Image",
      name: "backgroundimage",
    },
    {
      type: "string",
      label: "Color",
      name: "color",
      options: [
        { label: "Default", value: "transparent" },
        { label: "Tint", value: "tint" },
        { label: "Primary", value: "primary" },
      ],
    },
  ],
};
