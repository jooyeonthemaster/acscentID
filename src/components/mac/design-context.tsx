'use client'
import { createContext, useContext } from 'react'
export const ScreenDesignContext = createContext<'retro' | 'mac'>('retro')
export const useScreenDesign = () => useContext(ScreenDesignContext)
