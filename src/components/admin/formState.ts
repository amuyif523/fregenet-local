export type AdminFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialAdminFormState: AdminFormState = {
  status: "idle"
};
