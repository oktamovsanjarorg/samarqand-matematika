import type { AdminCourseTree } from "@samarqand/shared";
import { useState } from "react";
import { InlineForm } from "../components/InlineForm";
import { QuestionSearch } from "../components/QuestionSearch";
import { RowActions } from "../components/RowActions";
import { TopicBlock } from "../components/TopicBlock";
import { Badge, Button, EmptyState, ErrorState, PageTitle, SkeletonList } from "../components/ui";
import { api } from "../lib/api";
import { moved, reorder, useTree, useTreeMutation } from "../lib/content";

function CourseHeader(p: {
  course: AdminCourseTree;
  onUp?: () => void;
  onDown?: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const { course, ...actions } = p;
  return (
    <div className="space-y-1">
      <h2 className="break-words text-lg font-extrabold">{course.title}</h2>
      <div className="flex items-center justify-between gap-2">
        {course.isPublished ? <Badge tone="success">Nashr qilingan</Badge> : <Badge>Qoralama</Badge>}
        <RowActions name={course.title} {...actions} />
      </div>
    </div>
  );
}

function CourseCard(p: { course: AdminCourseTree; siblings: string[]; index: number }) {
  const { course } = p;
  const [renaming, setRenaming] = useState(false);
  const update = useTreeMutation((data: object) => api.patch(`/admin/courses/${course.id}`, data));
  const remove = useTreeMutation(() => api.del(`/admin/courses/${course.id}`));
  const addTopic = useTreeMutation((title: string) =>
    api.post(`/admin/courses/${course.id}/topics`, { title }),
  );
  const order = useTreeMutation(reorder);
  const move = (dir: -1 | 1) => {
    const next = moved(p.siblings, p.index, dir);
    return next ? () => order.mutate({ kind: "course", ids: next }) : undefined;
  };
  const error = update.error ?? remove.error ?? addTopic.error ?? order.error;

  return (
    <article className="card space-y-3" data-testid="course">
      {renaming ? (
        <InlineForm
          label="Saqlash"
          placeholder="Kurs nomi"
          initial={course.title}
          busy={update.isPending}
          onSubmit={(title) => update.mutate({ title }, { onSuccess: () => setRenaming(false) })}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <CourseHeader
          course={course}
          onUp={move(-1)}
          onDown={move(1)}
          onRename={() => setRenaming(true)}
          onDelete={() => remove.mutate(undefined)}
        />
      )}
      <Button
        variant="secondary"
        busy={update.isPending}
        onClick={() => update.mutate({ isPublished: !course.isPublished })}
      >
        {course.isPublished ? "Nashrdan olish" : "Nashr qilish"}
      </Button>
      <div className="space-y-2">
        {course.topics.map((t, i) => (
          <TopicBlock key={t.id} topic={t} siblings={course.topics.map((x) => x.id)} index={i} />
        ))}
      </div>
      <InlineForm
        label="Mavzu"
        placeholder="Yangi mavzu nomi"
        busy={addTopic.isPending}
        onSubmit={(t) => addTopic.mutate(t)}
      />
      {error && <p className="text-sm text-danger">{error.message}</p>}
    </article>
  );
}

export function ContentPage() {
  const tree = useTree();
  const addCourse = useTreeMutation((title: string) => api.post("/admin/courses", { title }));
  const ids = tree.data?.map((c) => c.id) ?? [];

  return (
    <div className="space-y-4">
      <PageTitle title="Kontent" />
      <p className="text-sm text-hint">
        Kurs → mavzu → dars. Oʻquvchi faqat nashr qilingan kurs va darslarni koʻradi.
      </p>
      <QuestionSearch />
      <InlineForm
        label="Kurs"
        placeholder="Yangi kurs nomi"
        busy={addCourse.isPending}
        onSubmit={(t) => addCourse.mutate(t)}
      />
      {addCourse.error && <p className="text-sm text-danger">{addCourse.error.message}</p>}
      {tree.isPending && <SkeletonList rows={2} />}
      {tree.isError && <ErrorState message={tree.error.message} onRetry={() => tree.refetch()} />}
      {tree.data?.length === 0 && (
        <EmptyState title="Hali kurs yoʻq" hint="Birinchi kursni yuqorida qoʻshing" />
      )}
      {tree.data?.map((c, i) => (
        <CourseCard key={c.id} course={c} siblings={ids} index={i} />
      ))}
    </div>
  );
}
