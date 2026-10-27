import { useState } from "react";
import { Button, Input, PhoneInput, Popover, PHONE_COUNTRIES, formatPhoneForDisplay, isPhoneNumberComplete } from "@nicecxone/lyra-ui";
import type { PhoneValue } from "@nicecxone/lyra-ui";

/* No dial pad exists in lyra-ui, so this composes Lyra's `PhoneInput` (country
   selector, mask, label + help icon) and `Button`s (outline keys, primary Dial). */

const KEYS: { digit: string; letters?: string }[] = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*" },
  { digit: "0", letters: "+" },
  { digit: "#" },
];

/* `PhoneInput` holds digits only, so `*`, `#` and `+` can't be entered into it. */
const isDigit = (key: string) => /^\d$/.test(key);

/* Pressing Dial opens a confirmation popover under the button asking for an
   account number; the prototype treats 12345 as an unknown account. */
const UNKNOWN_ACCOUNT = "12345";

export function DialPad({ onDial }: { onDial?: (number: string, accountNumber: string) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [account, setAccount] = useState("");
  const trimmedAccount = account.trim();
  const unknownAccount = trimmedAccount === UNKNOWN_ACCOUNT;
  const canConfirm = trimmedAccount.length > 0 && !unknownAccount;

  const [value, setValue] = useState<PhoneValue>({ countryCode: "us", number: "" });
  const country = PHONE_COUNTRIES.find((c) => c.code === value.countryCode);
  const canDial = !!country && isPhoneNumberComplete(value.number, country);

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <PhoneInput
        label="Enter phone number"
        labelHelpText="Enter a number using the keypad or your keyboard."
        value={value}
        onChange={setValue}
      />
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map(({ digit, letters }) => (
          <Button
            key={digit}
            variant="outline"
            aria-label={letters ? `${digit} ${letters}` : digit}
            className="h-16 flex-col gap-0 leading-none"
            disabled={!isDigit(digit)}
            onClick={() => setValue((v) => ({ ...v, number: v.number + digit }))}
          >
            <span className="lyra-heading-lg">{digit}</span>
            {letters && <span className="lyra-body-xs-emphasis">{letters}</span>}
          </Button>
        ))}
      </div>
      <Popover
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (open) setAccount("");
        }}
        placement="bottom"
        align="center"
        className="w-80"
        title={`Confirm call to ${formatPhoneForDisplay(`${country?.dial ?? ""}${value.number}`)}`}
        footer={
          <div className="flex justify-end gap-2 px-4 py-3">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canConfirm}
              onClick={() => {
                setConfirmOpen(false);
                onDial?.(`${country?.dial ?? ""}${value.number}`, trimmedAccount);
              }}
            >
              Dial
            </Button>
          </div>
        }
        content={
          <div className="flex flex-col gap-4 pb-2">
            <p className="lyra-body-md text-lyra-fg-default">
              Please enter an account number and then select "Dial" below to confirm and initiate the call or "Cancel"
              to exit.
            </p>
            <Input
              label="Enter an account number"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              error={unknownAccount ? "Unknown account number" : undefined}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) {
                  setConfirmOpen(false);
                  onDial?.(`${country?.dial ?? ""}${value.number}`, trimmedAccount);
                }
              }}
            />
          </div>
        }
      >
        <Button className="w-full" disabled={!canDial}>
          Dial
        </Button>
      </Popover>
    </div>
  );
}
