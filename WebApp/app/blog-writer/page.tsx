import { redirect } from "next/navigation";

type BlogWriterRedirectProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BlogWriterRedirect(props: BlogWriterRedirectProps) {
  const searchParams = await props.searchParams;
  const params = new URLSearchParams();

  const brandId = searchParams.brandId;
  if (typeof brandId === "string" && brandId.trim()) {
    params.set("brandId", brandId.trim());
  }

  const blogId = searchParams.blogId;
  if (typeof blogId === "string" && blogId.trim()) {
    params.set("blogId", blogId.trim());
  }

  const query = params.toString();
  redirect(`/brand-monitor${query ? `?${query}` : ""}#ugc`);
}
