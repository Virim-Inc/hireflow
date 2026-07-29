"use client"
/* eslint-disable react-refresh/only-export-components */

import * as React from "react"

import { cn } from "@/lib/utils"

type ComboboxValueType = string | string[]

interface ComboboxContextValue {
  multiple: boolean
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  openCombobox: () => void
  toggleOpen: () => void
  items: string[]
  query: string
  setQuery: (value: string) => void
  filteredItems: string[]
  highlightedIndex: number
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>
  value: ComboboxValueType
  selectItem: (item: string) => void
  isSelected: (item: string) => boolean
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

function useComboboxContext(component: string) {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error(`${component} must be used within Combobox`)
  }
  return context
}

export function useComboboxAnchor() {
  return React.useRef<HTMLDivElement>(null)
}

export function Combobox({
  children,
  items,
  multiple = false,
  value,
  defaultValue,
  onValueChange,
  inputValue,
  onInputValueChange,
  autoHighlight = false,
  className,
}: {
  children: React.ReactNode
  items: readonly string[]
  multiple?: boolean
  value?: ComboboxValueType
  defaultValue?: ComboboxValueType
  onValueChange?: (value: ComboboxValueType) => void
  inputValue?: string
  onInputValueChange?: (value: string) => void
  autoHighlight?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [internalQuery, setInternalQuery] = React.useState("")
  const [internalValue, setInternalValue] = React.useState<ComboboxValueType>(
    defaultValue ?? (multiple ? [] : "")
  )
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const currentValue = value !== undefined ? value : internalValue
  const query = inputValue !== undefined ? inputValue : internalQuery
  const filteredItems = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return [...items]
    return items.filter((item) => item.toLowerCase().includes(normalizedQuery))
  }, [items, query])

  const setValue = React.useCallback(
    (nextValue: ComboboxValueType) => {
      if (value === undefined) {
        setInternalValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [onValueChange, value]
  )

  const setQuery = React.useCallback(
    (nextQuery: string) => {
      if (inputValue === undefined) {
        setInternalQuery(nextQuery)
      }
      onInputValueChange?.(nextQuery)
    },
    [inputValue, onInputValueChange]
  )

  const isSelected = React.useCallback(
    (item: string) => {
      if (multiple) {
        return Array.isArray(currentValue) && currentValue.includes(item)
      }
      return currentValue === item
    },
    [currentValue, multiple]
  )

  const selectItem = React.useCallback(
    (item: string) => {
      if (multiple) {
        const values = Array.isArray(currentValue) ? currentValue : []
        const nextValue = values.includes(item)
          ? values.filter((valueItem) => valueItem !== item)
          : [...values, item]
        setValue(nextValue)
        setQuery("")
        setHighlightedIndex(autoHighlight && filteredItems.length ? 0 : -1)
        setOpen(true)
        return
      }

      setValue(item)
      setQuery(item)
      setHighlightedIndex(autoHighlight ? 0 : -1)
      setOpen(false)
    },
    [autoHighlight, currentValue, filteredItems.length, multiple, setQuery, setValue]
  )

  React.useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [])

  const openCombobox = React.useCallback(() => {
    setOpen(true)
  }, [])

  const toggleOpen = React.useCallback(() => {
    setOpen((current) => !current)
  }, [])

  const contextValue = React.useMemo<ComboboxContextValue>(
    () => ({
      multiple,
      open,
      setOpen,
      openCombobox,
      toggleOpen,
      items: [...items],
      query,
      filteredItems,
      highlightedIndex,
      setHighlightedIndex,
      value: currentValue,
      selectItem,
      isSelected,
      setQuery,
    }),
    [
      currentValue,
      filteredItems,
      highlightedIndex,
      isSelected,
      items,
      multiple,
      openCombobox,
      open,
      query,
      selectItem,
      setQuery,
      toggleOpen,
    ]
  )

  return (
    <ComboboxContext.Provider value={contextValue}>
      <div ref={rootRef} className={cn(className, open && "is-open")}>
        {children}
      </div>
    </ComboboxContext.Provider>
  )
}

export const ComboboxTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function ComboboxTrigger({ className, onClick, ...props }, ref) {
  const { openCombobox } = useComboboxContext("ComboboxTrigger")

  return (
    <div
      ref={ref}
      className={cn(className)}
      onClick={(event) => {
        openCombobox()
        onClick?.(event)
      }}
      {...props}
    />
  )
})

export const ComboboxChips = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(function ComboboxChips({ className, ...props }, ref) {
  const { open } = useComboboxContext("ComboboxChips")

  return (
    <div
      ref={ref}
      data-open={open ? "true" : "false"}
      className={cn(className)}
      {...props}
    />
  )
})

export function ComboboxValue({
  children,
}: {
  children: (values: string[]) => React.ReactNode
}) {
  const { value, multiple } = useComboboxContext("ComboboxValue")
  const values = React.useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : []
    }
    return typeof value === "string" && value ? [value] : []
  }, [multiple, value])

  return <>{children(values)}</>
}

export function ComboboxChip({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return <span className={cn(className)} {...props} />
}

export const ComboboxChipsInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(function ComboboxChipsInput({ className, onChange, onFocus, onKeyDown, ...props }, ref) {
  const {
    open,
    setOpen,
    query,
    setQuery,
    filteredItems,
    highlightedIndex,
    setHighlightedIndex,
    selectItem,
  } = useComboboxContext("ComboboxChipsInput")

  return (
    <input
      ref={ref}
      value={query}
      className={cn(className)}
      maxLength={100}
      onChange={(event) => {
        setQuery(event.target.value.slice(0, 100))
        setHighlightedIndex(0)
        setOpen(true)
        onChange?.(event)
      }}
      onFocus={(event) => {
        setOpen(true)
        onFocus?.(event)
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault()
          if (!open) setOpen(true)
          if (!filteredItems.length) return
          setHighlightedIndex((current) =>
            current < filteredItems.length - 1 ? current + 1 : 0
          )
        } else if (event.key === "ArrowUp") {
          event.preventDefault()
          if (!filteredItems.length) return
          setHighlightedIndex((current) =>
            current > 0 ? current - 1 : filteredItems.length - 1
          )
        } else if (event.key === "Enter") {
          if (open && highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
            event.preventDefault()
            selectItem(filteredItems[highlightedIndex])
          }
        } else if (event.key === "Escape") {
          setOpen(false)
        }

        onKeyDown?.(event)
      }}
      {...props}
    />
  )
})

export function ComboboxContent({
  children,
  className,
  anchor,
}: {
  children: React.ReactNode
  className?: string
  anchor?: React.RefObject<HTMLElement | null>
}) {
  const { open } = useComboboxContext("ComboboxContent")

  if (!open) return null

  return (
    <div
      className={cn(className)}
      style={anchor?.current ? { minWidth: anchor.current.offsetWidth } : undefined}
    >
      {children}
    </div>
  )
}

export function ComboboxToggle({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleOpen } = useComboboxContext("ComboboxToggle")

  return (
    <button
      type="button"
      className={cn(className)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        toggleOpen()
        onClick?.(event)
      }}
      {...props}
    />
  )
}

export function ComboboxEmpty({
  children,
  className,
}: React.ComponentProps<"div">) {
  const { filteredItems } = useComboboxContext("ComboboxEmpty")

  if (filteredItems.length) return null

  return <div className={cn(className)}>{children}</div>
}

export function ComboboxList({
  children,
  className,
}: {
  children: (item: string, index: number) => React.ReactNode
  className?: string
}) {
  const { filteredItems } = useComboboxContext("ComboboxList")

  return (
    <div className={cn(className)}>
      {filteredItems.map((item, index) => children(item, index))}
    </div>
  )
}

export function ComboboxItem({
  children,
  value,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  value: string
}) {
  const {
    highlightedIndex,
    setHighlightedIndex,
    filteredItems,
    selectItem,
    isSelected,
  } = useComboboxContext("ComboboxItem")

  const index = filteredItems.findIndex((item) => item === value)
  const selected = isSelected(value)
  const highlighted = index === highlightedIndex

  return (
    <button
      type="button"
      data-selected={selected ? "true" : "false"}
      data-highlighted={highlighted ? "true" : "false"}
      className={cn(className)}
      onMouseEnter={() => setHighlightedIndex(index)}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => selectItem(value)}
      {...props}
    >
      {children}
    </button>
  )
}
