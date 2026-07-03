import React, { useRef, useState, useEffect } from "react";
import { TextField } from "@mui/material";

/**
 * A TextField wrapper that:
 * - Displays "0" normally when the value is 0 (not as placeholder)
 * - When focused and the value is "0", selects all text so the next keystroke replaces it
 * - Shows placeholder="0" only when the field is truly empty
 * - STRICTLY enforces comma (,) as the decimal separator for display and input
 * - Passes dot (.) formatted strings to the parent onChange for mathematical operations
 */
export default function ZeroHidingTextField(props) {
  const inputRef = useRef(null);
  
  const { type, onChange, value, ...rest } = props;

  // Local state to keep track of what the user is currently typing
  const [localValue, setLocalValue] = useState(() => String(value ?? "").replace(".", ","));

  // Sync localValue if parent's value changes from outside (e.g. initial load or reset)
  useEffect(() => {
    const parentStr = String(value ?? "");
    const localStrAsSystem = localValue.replace(",", ".");
    
    if (parentStr === localStrAsSystem) return;

    // Check if the only difference is a trailing comma or trailing zero after comma
    if (parseFloat(localStrAsSystem) === parseFloat(parentStr) && parentStr !== "") {
        return; // trust local string
    }
    
    if (parentStr === "" && localValue === "") return;

    setLocalValue(parentStr.replace(".", ","));
  }, [value, localValue]);

  const handleFocus = (e) => {
    const val = localValue;
    if (val === "0" || val === "0,0" || val === "0.0") {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.select();
        } else if (e.target) {
          e.target.select();
        }
      }, 0);
    }
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  const handleChange = (e) => {
    let rawVal = e.target.value;

    // Convert dots to commas
    rawVal = rawVal.replace(/\./g, ",");

    // Allow empty, minus, or digits with optional single comma
    if (!/^-?\d*,?\d*$/.test(rawVal)) {
      return; 
    }

    setLocalValue(rawVal);

    if (onChange) {
      const systemValue = (rawVal === "" || rawVal === "-") ? rawVal : rawVal.replace(",", ".");
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: systemValue,
          name: e.target.name
        }
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <TextField
      {...rest}
      type="text" 
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      inputRef={inputRef}
    />
  );
}
