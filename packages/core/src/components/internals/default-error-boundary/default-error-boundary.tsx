import { useRouteError, isRouteErrorResponse } from "react-router";
import { Button } from "../../button";
import { AlertCircle } from "lucide-react";
import { useT } from "@/i18n-labels";
import { Text } from "../../text";

export const DefaultErrorBoundary = () => {
  const error = useRouteError();
  const t = useT();

  const containerProps = {
    role: "alert",
    "aria-label": "default-error-boundary",
  } as const;

  // Handle 404s
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div {...containerProps} className="astw:p-6">
        <div className="astw:flex astw:items-start astw:gap-4">
          <AlertCircle className="astw:h-5 astw:w-5 astw:text-danger-text astw:flex-shrink-0 astw:mt-0.5" />
          <div>
            <Text.h1 variant="heading-md">{t("error404Title")}</Text.h1>
            <Text variant="body-md" className="astw:text-muted-foreground astw:mt-1">
              {t("error404Body")}
            </Text>
            <Button
              variant="outline"
              size="sm"
              className="astw:mt-4"
              onClick={() => window.history.back()}
            >
              {t("goBack")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle other errors
  const message = error instanceof Error ? error.message : t("errorUnexpected");

  return (
    <div {...containerProps} className="astw:p-6">
      <div className="astw:flex astw:items-start astw:gap-4">
        <AlertCircle className="astw:h-5 astw:w-5 astw:text-danger-text astw:flex-shrink-0 astw:mt-0.5" />
        <div>
          <Text.h1 variant="heading-md">{t("errorTitle")}</Text.h1>
          <Text variant="body-md" className="astw:text-muted-foreground astw:mt-1">
            {message}
          </Text>
          <Button
            variant="outline"
            size="sm"
            className="astw:mt-4"
            onClick={() => window.location.reload()}
          >
            {t("tryAgain")}
          </Button>
        </div>
      </div>
    </div>
  );
};
