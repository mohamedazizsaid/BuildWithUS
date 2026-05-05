'use client'

import { createContext, useContext } from 'react'

export const VarLabelsContext = createContext<Record<string, string>>({})
export const useVarLabels = () => useContext(VarLabelsContext)
