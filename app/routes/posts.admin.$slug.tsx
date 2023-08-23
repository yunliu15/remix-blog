import { ActionArgs, LoaderArgs, json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import invariant from "tiny-invariant";
import { marked } from "marked";

import { createPost, deletePost, getPost, updatePost } from "~/models/post.server";
import { requireAdminUser } from "~/session.server";

export const loader = async ({request, params}: LoaderArgs ) => {
  invariant(params.slug, "params.slug is required!");

  await requireAdminUser(request);
  if (params.slug === "new") {
    return json({post:null, html:''});
  }
  const post = await getPost(params.slug);
  invariant(post, `Post not found: ${params.slug}`);
  const html = marked(post.markdown);
  return json({post, html});
}

export const action = async ( {request, params}: ActionArgs ) => {
  invariant(params.slug, "params.slug is required!");
  await requireAdminUser(request);
    const formData = await request.formData();

    const title = formData.get("title");
    const slug = formData.get("slug");
    const markdown = formData.get("markdown");
    const intent = formData.get("intent");

    if (intent === "delete") {
      await deletePost(params.slug);
      return redirect("/posts/admin");
    }

    const errors = {
        title: title ? null: "Title is required",
        slug: slug ? null : "Slug is required",
        markdown: markdown? null: "Markdown is required",
    }
    const hasErrors = Object.values(errors).some((errorMessage) => errorMessage);
    if (hasErrors) {
        return json(errors);
    }

    invariant(
        typeof title === "string",
        "title must be a string"
    );
    invariant(
        typeof slug === "string",
        "slug must be a string"
    );
    invariant(
        typeof markdown === "string",
        "markdown must be a string"
    )
    if (params.slug === "new") {
      await createPost({title, slug, markdown});
    } else {
      await updatePost(params.slug, {title, slug, markdown});
    }

    return redirect("/posts/admin");
}

const inputClassName =
  "w-full rounded border border-gray-500 px-2 py-1 text-lg";

export default function NewPost() {
    const errors = useActionData<typeof action>();

    const navigation = useNavigation();
    const isProcessing = Boolean(
        navigation.state === "submitting"
    );
    const { post, html } = useLoaderData<typeof loader>();
    const isNewPost = !post;
    
  return (
    <Form method="post" key={post?.slug || "new"}>
      <p>
        <label>
          Post Title:{" "}
          {errors?.title ? (
            <em className="text-red-600">{errors.title}</em>
          ) : null}
          <input
            type="text"
            name="title"
            className={inputClassName}
            defaultValue={post?.title}
          />
        </label>
      </p>
      <p>
        <label>
          Post Slug:{" "}
          {errors?.slug ? (
            <em className="text-red-600">{errors.slug}</em>
          ) : null}
          <input
            type="text"
            name="slug"
            className={inputClassName}
            defaultValue={post?.slug}
          />
        </label>
      </p>
      <p>
        <label htmlFor="markdown">Markdown: 
        {errors?.markdown ? (
            <em className="text-red-600">
              {errors.markdown}
            </em>
          ) : null}</label>
        <br />
        <textarea
          id="markdown"
          rows={20}
          name="markdown"
          className={`${inputClassName} font-mono`}
          defaultValue={html}
        />
      </p>
      <p className="flex justify-end gap-4">
        <Link className="py-2 px-4 hover:underline" to="/posts/admin">Cancel</Link>
      {!isNewPost && (
          <button
            type="submit"
            name="intent"
            value="delete"
            className="rounded bg-red-500 py-2 px-4 text-white hover:bg-red-600 focus:bg-red-400 disabled:bg-red-300"
            disabled={isProcessing}
          >
            {isProcessing ? "Deleting..." : "Delete"}
          </button>
        )}
        <button
          type="submit"
          className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
          disabled={isProcessing}
        >
          {
          isNewPost? (isProcessing? "Creating..." : "Create Post")
          : (isProcessing? "Updating..." : "Update Post")
          
        }
        </button>
      </p>
    </Form>
  );
}