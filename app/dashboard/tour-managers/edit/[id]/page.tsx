"use client";

import { useParams } from "next/navigation";
import AddEditTourManagerPage from "../../add/page";

export default function EditTourManagerPage() {
  const params = useParams();
  const id = params?.id as string;
  return <AddEditTourManagerPage editId={id} />;
}

