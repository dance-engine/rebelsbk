'use client'
// import LogoImage from '@public/rebel-demo.png';
import Image from 'next/image'

export default function Logo({className}) {
  return <Image className={className} alt="Rebel SBK" src="/rebel-demo.png" height={96} width={96}/>;
}