"use client";

export default function DeleteButton({
  action,
  confirmMessage,
  label = "Delete",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <button type="submit" className="text-red-600 hover:underline">
        {label}
      </button>
    </form>
  );
}
