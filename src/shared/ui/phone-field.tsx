import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

type PhoneFieldProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
};

export function PhoneField({
  id,
  name,
  value,
  onChange,
  error,
  className,
  disabled,
}: PhoneFieldProps) {
  const wrapperClassName = [
    "register-phone-wrapper",
    error ? "!border-red-500" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClassName}>
      <PhoneInput
        defaultCountry="py"
        preferredCountries={["py", "ar", "br", "cl", "uy"]}
        disableDialCodeAndPrefix
        showDisabledDialCodeAndPrefix
        defaultMask="(...) ... - ..."
        placeholder="(981) 123 - 456"
        value={value}
        onChange={(phone) => onChange(phone)}
        className="register-phone-root"
        inputClassName="register-phone-input"
        inputProps={{
          name,
          autoComplete: "tel",
          id,
          disabled,
        }}
        countrySelectorStyleProps={{
          buttonClassName: "register-phone-country-button",
          flagClassName: "register-phone-flag",
          dropdownArrowClassName: "register-phone-country-arrow",
          dropdownStyleProps: {
            className: "register-phone-country-dropdown",
            listItemClassName: "register-phone-country-item",
            listItemSelectedClassName: "register-phone-country-item-selected",
            listItemFocusedClassName: "register-phone-country-item-focused",
          },
        }}
      />
    </div>
  );
}
