import React from "react";
import BlogPostItem from "@theme-original/BlogPostItem";
import type BlogPostItemType from "@theme/BlogPostItem";
import type { WrapperProps } from "@docusaurus/types";
import { useBlogPost } from "@docusaurus/plugin-content-blog/client";
import Comments from "@site/src/components/Comments";
import styles from "./styles.module.css";

type Props = WrapperProps<typeof BlogPostItemType>;

export default function BlogPostItemWrapper(props: Props): JSX.Element {
  const { metadata, isBlogPostPage } = useBlogPost();
  const { comments = true } = metadata.frontMatter;
  const image = (metadata.frontMatter as Record<string, unknown>)?.image as string | undefined
    || metadata.image;

  // Blog list page: show thumbnail alongside the post excerpt
  if (!isBlogPostPage && image) {
    const localImage = image.includes("/static/img/")
      ? image.replace(/.*\/static\/img\//, "/img/")
      : image;

    return (
      <div className={styles.blogPostWithImage}>
        <a href={metadata.permalink} className={styles.thumbnailLink}>
          <img
            src={localImage}
            alt={metadata.title}
            className={styles.thumbnail}
            loading="lazy"
          />
        </a>
        <BlogPostItem {...props} />
      </div>
    );
  }

  // Individual post page: default layout + comments
  return (
    <>
      <BlogPostItem {...props} />
      {comments && isBlogPostPage && <Comments />}
    </>
  );
}