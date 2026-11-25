interface TextFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  multiline?: boolean;
  /** What the field starts with, e.g. the value being changed. */
  defaultValue?: string;
  /** The field's errors from the action, shown under it. */
  errors?: string[];
}

/** A labelled form field with its errors, for the app's forms. */
export function TextField({
  label,
  name,
  type = "text",
  autoComplete,
  multiline,
  defaultValue,
  errors,
}: TextFieldProps) {
  const errorId = `${name}-errors`;
  const shared = {
    id: name,
    name,
    required: true,
    defaultValue,
    "aria-invalid": errors?.length ? true : undefined,
    "aria-describedby": errors?.length ? errorId : undefined,
    className: "mt-1 block w-full rounded border border-gray-300 px-3 py-2",
  };
  return (
    <div>
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea rows={3} {...shared} />
      ) : (
        <input type={type} autoComplete={autoComplete} {...shared} />
      )}
      {errors?.length ? (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {errors.join(" ")}
        </p>
      ) : null}
    </div>
  );
}

/** A form-wide message, such as a refused sign-in. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
      {message}
    </p>
  );
}
