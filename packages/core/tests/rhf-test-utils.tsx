import type { ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import {
  Controller,
  useForm,
  type ControllerFieldState,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldValues,
  type Path,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";

import { Form } from "@/components/form";

type RHFFormApi<TFieldValues extends FieldValues> = UseFormReturn<TFieldValues, any, TFieldValues>;

type RenderControlArgs<TFieldValues extends FieldValues, TName extends Path<TFieldValues>> = {
  field: ControllerRenderProps<TFieldValues, TName>;
  fieldState: ControllerFieldState;
  form: RHFFormApi<TFieldValues>;
};

type RenderRHFFormOptions<TFieldValues extends FieldValues, TName extends Path<TFieldValues>> = {
  defaultValues: DefaultValues<TFieldValues>;
  name: TName;
  mode?: "onSubmit" | "onBlur" | "onChange" | "onTouched" | "all";
  rules?: RegisterOptions<TFieldValues, TName>;
  onSubmit?: (values: TFieldValues) => void;
  render: (args: RenderControlArgs<TFieldValues, TName>) => ReactNode;
  renderOptions?: Omit<RenderOptions, "wrapper">;
};

type RenderRHFFormResult<TFieldValues extends FieldValues> = RenderResult & {
  form: () => RHFFormApi<TFieldValues>;
};

export function renderRHFForm<TFieldValues extends FieldValues, TName extends Path<TFieldValues>>({
  defaultValues,
  name,
  mode,
  rules,
  onSubmit,
  render: renderControl,
  renderOptions,
}: RenderRHFFormOptions<TFieldValues, TName>): RenderRHFFormResult<TFieldValues> {
  let formApi!: RHFFormApi<TFieldValues>;

  function Harness() {
    const form = useForm<TFieldValues>({ defaultValues, mode });
    formApi = form;

    return (
      <Form onSubmit={form.handleSubmit((values) => onSubmit?.(values))}>
        <Controller
          name={name}
          control={form.control}
          rules={rules}
          render={({ field, fieldState }) => <>{renderControl({ field, fieldState, form })}</>}
        />
        <button type="submit">Submit</button>
        <button type="button" onClick={() => form.reset()}>
          Reset
        </button>
      </Form>
    );
  }

  const result = render(<Harness />, renderOptions);

  return {
    ...result,
    form: () => formApi,
  };
}
