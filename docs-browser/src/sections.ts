export const sections = [
  { label: "Guide and Concepts", categories: ["guides", "concepts"] },
  { label: "Components and APIs", categories: ["components", "api"] },
  { label: "Patterns and Pages", categories: ["patterns", "pages"] },
];

export function sectionForPath(pathname: string) {
  const category = pathname.split("/")[1];
  return sections.find((section) => section.categories.includes(category)) ?? sections[0];
}
