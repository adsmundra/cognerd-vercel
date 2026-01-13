import { redirect } from "next/navigation";

type GenerateFilesRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GenerateFilesRedirect(props: GenerateFilesRedirectProps) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();

  const brandId = searchParams.brandId;
  if (typeof brandId === "string" && brandId.trim()) {
    params.set("brandId", brandId.trim());
  }

  const query = params.toString();
  redirect(`/brand-monitor${query ? `?${query}` : ""}#files`);
}
