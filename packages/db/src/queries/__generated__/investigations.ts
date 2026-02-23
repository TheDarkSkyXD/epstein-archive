/** Types generated for queries found in "src/queries/investigations.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

/** 'GetInvestigations' parameters type */
export interface IGetInvestigationsParams {
  limit: NumberOrString;
  offset: NumberOrString;
  ownerId?: string | null | void;
  status?: string | null | void;
}

/** 'GetInvestigations' return type */
export interface IGetInvestigationsResult {
  collaborator_ids: string | null;
  created_at: Date | null;
  description: string | null;
  id: string;
  owner_id: string | null;
  scope: string | null;
  status: string | null;
  title: string;
  updated_at: Date | null;
  uuid: string | null;
}

/** 'GetInvestigations' query type */
export interface IGetInvestigationsQuery {
  params: IGetInvestigationsParams;
  result: IGetInvestigationsResult;
}

const getInvestigationsIR: any = {
  usedParamSet: { status: true, ownerId: true, limit: true, offset: true },
  params: [
    {
      name: 'status',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 151, b: 157 },
        { a: 185, b: 191 },
      ],
    },
    {
      name: 'ownerId',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 201, b: 208 },
        { a: 238, b: 245 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 279, b: 285 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 294, b: 301 }] },
  ],
  statement:
    'SELECT \n  id,\n  uuid,\n  title,\n  description,\n  owner_id,\n  collaborator_ids,\n  status,\n  scope,\n  created_at,\n  updated_at\nFROM investigations\nWHERE (:status::text IS NULL OR status = :status)\n  AND (:ownerId::text IS NULL OR owner_id = :ownerId)\nORDER BY updated_at DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   uuid,
 *   title,
 *   description,
 *   owner_id,
 *   collaborator_ids,
 *   status,
 *   scope,
 *   created_at,
 *   updated_at
 * FROM investigations
 * WHERE (:status::text IS NULL OR status = :status)
 *   AND (:ownerId::text IS NULL OR owner_id = :ownerId)
 * ORDER BY updated_at DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getInvestigations = new PreparedQuery<
  IGetInvestigationsParams,
  IGetInvestigationsResult
>(getInvestigationsIR);

/** 'CountInvestigations' parameters type */
export interface ICountInvestigationsParams {
  ownerId?: string | null | void;
  status?: string | null | void;
}

/** 'CountInvestigations' return type */
export interface ICountInvestigationsResult {
  total: string | null;
}

/** 'CountInvestigations' query type */
export interface ICountInvestigationsQuery {
  params: ICountInvestigationsParams;
  result: ICountInvestigationsResult;
}

const countInvestigationsIR: any = {
  usedParamSet: { status: true, ownerId: true },
  params: [
    {
      name: 'status',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 54, b: 60 },
        { a: 88, b: 94 },
      ],
    },
    {
      name: 'ownerId',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 104, b: 111 },
        { a: 141, b: 148 },
      ],
    },
  ],
  statement:
    'SELECT COUNT(*) as total \nFROM investigations \nWHERE (:status::text IS NULL OR status = :status)\n  AND (:ownerId::text IS NULL OR owner_id = :ownerId)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) as total
 * FROM investigations
 * WHERE (:status::text IS NULL OR status = :status)
 *   AND (:ownerId::text IS NULL OR owner_id = :ownerId)
 * ```
 */
export const countInvestigations = new PreparedQuery<
  ICountInvestigationsParams,
  ICountInvestigationsResult
>(countInvestigationsIR);

/** 'GetInvestigationById' parameters type */
export interface IGetInvestigationByIdParams {
  id: NumberOrString;
}

/** 'GetInvestigationById' return type */
export interface IGetInvestigationByIdResult {
  collaborator_ids: string | null;
  created_at: Date | null;
  description: string | null;
  id: string;
  owner_id: string | null;
  scope: string | null;
  status: string | null;
  title: string;
  updated_at: Date | null;
  uuid: string | null;
}

/** 'GetInvestigationById' query type */
export interface IGetInvestigationByIdQuery {
  params: IGetInvestigationByIdParams;
  result: IGetInvestigationByIdResult;
}

const getInvestigationByIdIR: any = {
  usedParamSet: { id: true },
  params: [
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 156, b: 159 }] },
  ],
  statement:
    'SELECT \n  id,\n  uuid,\n  title,\n  description,\n  owner_id,\n  collaborator_ids,\n  status,\n  scope,\n  created_at,\n  updated_at\nFROM investigations \nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   uuid,
 *   title,
 *   description,
 *   owner_id,
 *   collaborator_ids,
 *   status,
 *   scope,
 *   created_at,
 *   updated_at
 * FROM investigations
 * WHERE id = :id!
 * ```
 */
export const getInvestigationById = new PreparedQuery<
  IGetInvestigationByIdParams,
  IGetInvestigationByIdResult
>(getInvestigationByIdIR);

/** 'GetInvestigationByUuid' parameters type */
export interface IGetInvestigationByUuidParams {
  uuid: string;
}

/** 'GetInvestigationByUuid' return type */
export interface IGetInvestigationByUuidResult {
  collaborator_ids: string | null;
  created_at: Date | null;
  description: string | null;
  id: string;
  owner_id: string | null;
  scope: string | null;
  status: string | null;
  title: string;
  updated_at: Date | null;
  uuid: string | null;
}

/** 'GetInvestigationByUuid' query type */
export interface IGetInvestigationByUuidQuery {
  params: IGetInvestigationByUuidParams;
  result: IGetInvestigationByUuidResult;
}

const getInvestigationByUuidIR: any = {
  usedParamSet: { uuid: true },
  params: [
    { name: 'uuid', required: true, transform: { type: 'scalar' }, locs: [{ a: 158, b: 163 }] },
  ],
  statement:
    'SELECT \n  id,\n  uuid,\n  title,\n  description,\n  owner_id,\n  collaborator_ids,\n  status,\n  scope,\n  created_at,\n  updated_at\nFROM investigations \nWHERE uuid = :uuid!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   id,
 *   uuid,
 *   title,
 *   description,
 *   owner_id,
 *   collaborator_ids,
 *   status,
 *   scope,
 *   created_at,
 *   updated_at
 * FROM investigations
 * WHERE uuid = :uuid!
 * ```
 */
export const getInvestigationByUuid = new PreparedQuery<
  IGetInvestigationByUuidParams,
  IGetInvestigationByUuidResult
>(getInvestigationByUuidIR);

/** 'DeleteInvestigation' parameters type */
export interface IDeleteInvestigationParams {
  id: NumberOrString;
}

/** 'DeleteInvestigation' return type */
export type IDeleteInvestigationResult = void;

/** 'DeleteInvestigation' query type */
export interface IDeleteInvestigationQuery {
  params: IDeleteInvestigationParams;
  result: IDeleteInvestigationResult;
}

const deleteInvestigationIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 38, b: 41 }] }],
  statement: 'DELETE FROM investigations WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM investigations WHERE id = :id!
 * ```
 */
export const deleteInvestigation = new PreparedQuery<
  IDeleteInvestigationParams,
  IDeleteInvestigationResult
>(deleteInvestigationIR);

/** 'CreateInvestigation' parameters type */
export interface ICreateInvestigationParams {
  description?: string | null | void;
  ownerId: string;
  title: string;
}

/** 'CreateInvestigation' return type */
export interface ICreateInvestigationResult {
  id: string;
}

/** 'CreateInvestigation' query type */
export interface ICreateInvestigationQuery {
  params: ICreateInvestigationParams;
  result: ICreateInvestigationResult;
}

const createInvestigationIR: any = {
  usedParamSet: { title: true, description: true, ownerId: true },
  params: [
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 66, b: 72 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 75, b: 86 }],
    },
    { name: 'ownerId', required: true, transform: { type: 'scalar' }, locs: [{ a: 89, b: 97 }] },
  ],
  statement:
    'INSERT INTO investigations (title, description, owner_id)\nVALUES (:title!, :description, :ownerId!)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigations (title, description, owner_id)
 * VALUES (:title!, :description, :ownerId!)
 * RETURNING id
 * ```
 */
export const createInvestigation = new PreparedQuery<
  ICreateInvestigationParams,
  ICreateInvestigationResult
>(createInvestigationIR);

/** 'UpdateInvestigation' parameters type */
export interface IUpdateInvestigationParams {
  collaboratorIds?: string | null | void;
  description?: string | null | void;
  id: NumberOrString;
  scope?: string | null | void;
  status?: string | null | void;
  title?: string | null | void;
}

/** 'UpdateInvestigation' return type */
export interface IUpdateInvestigationResult {
  assigned_to: string | null;
  collaborator_ids: string | null;
  created_at: Date | null;
  created_by: string | null;
  description: string | null;
  id: string;
  metadata_json: Json | null;
  owner_id: string | null;
  priority: string | null;
  scope: string | null;
  status: string | null;
  title: string;
  updated_at: Date | null;
  uuid: string | null;
}

/** 'UpdateInvestigation' query type */
export interface IUpdateInvestigationQuery {
  params: IUpdateInvestigationParams;
  result: IUpdateInvestigationResult;
}

const updateInvestigationIR: any = {
  usedParamSet: {
    title: true,
    description: true,
    status: true,
    scope: true,
    collaboratorIds: true,
    id: true,
  },
  params: [
    { name: 'title', required: false, transform: { type: 'scalar' }, locs: [{ a: 46, b: 51 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 87, b: 98 }],
    },
    { name: 'status', required: false, transform: { type: 'scalar' }, locs: [{ a: 135, b: 141 }] },
    { name: 'scope', required: false, transform: { type: 'scalar' }, locs: [{ a: 172, b: 177 }] },
    {
      name: 'collaboratorIds',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 218, b: 233 }],
    },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 299, b: 302 }] },
  ],
  statement:
    'UPDATE investigations\nSET \n  title = COALESCE(:title, title),\n  description = COALESCE(:description, description),\n  status = COALESCE(:status, status),\n  scope = COALESCE(:scope, scope),\n  collaborator_ids = COALESCE(:collaboratorIds, collaborator_ids),\n  updated_at = CURRENT_TIMESTAMP\nWHERE id = :id!\nRETURNING *',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE investigations
 * SET
 *   title = COALESCE(:title, title),
 *   description = COALESCE(:description, description),
 *   status = COALESCE(:status, status),
 *   scope = COALESCE(:scope, scope),
 *   collaborator_ids = COALESCE(:collaboratorIds, collaborator_ids),
 *   updated_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * RETURNING *
 * ```
 */
export const updateInvestigation = new PreparedQuery<
  IUpdateInvestigationParams,
  IUpdateInvestigationResult
>(updateInvestigationIR);

/** 'GetEvidence' parameters type */
export interface IGetEvidenceParams {
  investigationId: NumberOrString;
  limit?: NumberOrString | null | void;
  offset?: NumberOrString | null | void;
}

/** 'GetEvidence' return type */
export interface IGetEvidenceResult {
  added_at: Date | null;
  added_by: string | null;
  description: string | null;
  id: string;
  investigation_evidence_id: string;
  metadata_json: Json | null;
  relevance: string | null;
  source_path: string | null;
  title: string;
  type: string | null;
}

/** 'GetEvidence' query type */
export interface IGetEvidenceQuery {
  params: IGetEvidenceParams;
  result: IGetEvidenceResult;
}

const getEvidenceIR: any = {
  usedParamSet: { investigationId: true, limit: true, offset: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 297, b: 313 }],
    },
    { name: 'limit', required: false, transform: { type: 'scalar' }, locs: [{ a: 347, b: 352 }] },
    { name: 'offset', required: false, transform: { type: 'scalar' }, locs: [{ a: 361, b: 367 }] },
  ],
  statement:
    'SELECT \n  e.id, \n  e.evidence_type as type, \n  e.title, \n  e.description, \n  e.source_path, \n  e.metadata_json,\n  ie.id as investigation_evidence_id,\n  ie.relevance, \n  ie.added_at, \n  ie.added_by\nFROM investigation_evidence ie\nJOIN evidence e ON ie.evidence_id = e.id\nWHERE ie.investigation_id = :investigationId!\nORDER BY ie.added_at DESC\nLIMIT :limit OFFSET :offset',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.evidence_type as type,
 *   e.title,
 *   e.description,
 *   e.source_path,
 *   e.metadata_json,
 *   ie.id as investigation_evidence_id,
 *   ie.relevance,
 *   ie.added_at,
 *   ie.added_by
 * FROM investigation_evidence ie
 * JOIN evidence e ON ie.evidence_id = e.id
 * WHERE ie.investigation_id = :investigationId!
 * ORDER BY ie.added_at DESC
 * LIMIT :limit OFFSET :offset
 * ```
 */
export const getEvidence = new PreparedQuery<IGetEvidenceParams, IGetEvidenceResult>(getEvidenceIR);

/** 'CountEvidence' parameters type */
export interface ICountEvidenceParams {
  investigationId: NumberOrString;
}

/** 'CountEvidence' return type */
export interface ICountEvidenceResult {
  total: string | null;
}

/** 'CountEvidence' query type */
export interface ICountEvidenceQuery {
  params: ICountEvidenceParams;
  result: ICountEvidenceResult;
}

const countEvidenceIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 78, b: 94 }],
    },
  ],
  statement:
    'SELECT COUNT(*) as total FROM investigation_evidence WHERE investigation_id = :investigationId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT COUNT(*) as total FROM investigation_evidence WHERE investigation_id = :investigationId!
 * ```
 */
export const countEvidence = new PreparedQuery<ICountEvidenceParams, ICountEvidenceResult>(
  countEvidenceIR,
);

/** 'GetEvidenceBySourcePath' parameters type */
export interface IGetEvidenceBySourcePathParams {
  sourcePath: string;
}

/** 'GetEvidenceBySourcePath' return type */
export interface IGetEvidenceBySourcePathResult {
  id: string;
}

/** 'GetEvidenceBySourcePath' query type */
export interface IGetEvidenceBySourcePathQuery {
  params: IGetEvidenceBySourcePathParams;
  result: IGetEvidenceBySourcePathResult;
}

const getEvidenceBySourcePathIR: any = {
  usedParamSet: { sourcePath: true },
  params: [
    { name: 'sourcePath', required: true, transform: { type: 'scalar' }, locs: [{ a: 44, b: 55 }] },
  ],
  statement: 'SELECT id FROM evidence WHERE source_path = :sourcePath!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT id FROM evidence WHERE source_path = :sourcePath!
 * ```
 */
export const getEvidenceBySourcePath = new PreparedQuery<
  IGetEvidenceBySourcePathParams,
  IGetEvidenceBySourcePathResult
>(getEvidenceBySourcePathIR);

/** 'CreateEvidence' parameters type */
export interface ICreateEvidenceParams {
  description?: string | null | void;
  evidenceType: string;
  originalFilename: string;
  redFlagRating: number;
  sourcePath: string;
  title: string;
}

/** 'CreateEvidence' return type */
export interface ICreateEvidenceResult {
  id: string;
}

/** 'CreateEvidence' query type */
export interface ICreateEvidenceQuery {
  params: ICreateEvidenceParams;
  result: ICreateEvidenceResult;
}

const createEvidenceIR: any = {
  usedParamSet: {
    title: true,
    description: true,
    evidenceType: true,
    sourcePath: true,
    originalFilename: true,
    redFlagRating: true,
  },
  params: [
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 114, b: 120 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 123, b: 134 }],
    },
    {
      name: 'evidenceType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 137, b: 150 }],
    },
    {
      name: 'sourcePath',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 153, b: 164 }],
    },
    {
      name: 'originalFilename',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 167, b: 184 }],
    },
    {
      name: 'redFlagRating',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 187, b: 201 }],
    },
  ],
  statement:
    'INSERT INTO evidence (title, description, evidence_type, source_path, original_filename, red_flag_rating)\nVALUES (:title!, :description, :evidenceType!, :sourcePath!, :originalFilename!, :redFlagRating!)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO evidence (title, description, evidence_type, source_path, original_filename, red_flag_rating)
 * VALUES (:title!, :description, :evidenceType!, :sourcePath!, :originalFilename!, :redFlagRating!)
 * RETURNING id
 * ```
 */
export const createEvidence = new PreparedQuery<ICreateEvidenceParams, ICreateEvidenceResult>(
  createEvidenceIR,
);

/** 'AddEvidenceToInvestigation' parameters type */
export interface IAddEvidenceToInvestigationParams {
  addedBy?: string | null | void;
  evidenceId: NumberOrString;
  investigationId: NumberOrString;
  notes?: string | null | void;
  relevance?: string | null | void;
}

/** 'AddEvidenceToInvestigation' return type */
export interface IAddEvidenceToInvestigationResult {
  id: string;
}

/** 'AddEvidenceToInvestigation' query type */
export interface IAddEvidenceToInvestigationQuery {
  params: IAddEvidenceToInvestigationParams;
  result: IAddEvidenceToInvestigationResult;
}

const addEvidenceToInvestigationIR: any = {
  usedParamSet: {
    investigationId: true,
    evidenceId: true,
    notes: true,
    relevance: true,
    addedBy: true,
  },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 103, b: 119 }],
    },
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 122, b: 133 }],
    },
    { name: 'notes', required: false, transform: { type: 'scalar' }, locs: [{ a: 136, b: 141 }] },
    {
      name: 'relevance',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 144, b: 153 }],
    },
    { name: 'addedBy', required: false, transform: { type: 'scalar' }, locs: [{ a: 156, b: 163 }] },
  ],
  statement:
    'INSERT INTO investigation_evidence (investigation_id, evidence_id, notes, relevance, added_by)\nVALUES (:investigationId!, :evidenceId!, :notes, :relevance, :addedBy)\nON CONFLICT (investigation_id, evidence_id) DO NOTHING\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigation_evidence (investigation_id, evidence_id, notes, relevance, added_by)
 * VALUES (:investigationId!, :evidenceId!, :notes, :relevance, :addedBy)
 * ON CONFLICT (investigation_id, evidence_id) DO NOTHING
 * RETURNING id
 * ```
 */
export const addEvidenceToInvestigation = new PreparedQuery<
  IAddEvidenceToInvestigationParams,
  IAddEvidenceToInvestigationResult
>(addEvidenceToInvestigationIR);

/** 'GetTimelineEvents' parameters type */
export interface IGetTimelineEventsParams {
  investigationId: NumberOrString;
}

/** 'GetTimelineEvents' return type */
export interface IGetTimelineEventsResult {
  confidence: number | null;
  created_at: Date | null;
  description: string | null;
  documents_json: Json | null;
  end_date: string | null;
  entities_json: Json | null;
  id: string;
  investigation_id: string | null;
  start_date: string | null;
  title: string;
  type: string | null;
}

/** 'GetTimelineEvents' query type */
export interface IGetTimelineEventsQuery {
  params: IGetTimelineEventsParams;
  result: IGetTimelineEventsResult;
}

const getTimelineEventsIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 70, b: 86 }],
    },
  ],
  statement:
    'SELECT * FROM investigation_timeline_events \nWHERE investigation_id = :investigationId! \nORDER BY start_date ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM investigation_timeline_events
 * WHERE investigation_id = :investigationId!
 * ORDER BY start_date ASC
 * ```
 */
export const getTimelineEvents = new PreparedQuery<
  IGetTimelineEventsParams,
  IGetTimelineEventsResult
>(getTimelineEventsIR);

/** 'CreateTimelineEvent' parameters type */
export interface ICreateTimelineEventParams {
  description?: string | null | void;
  endDate?: string | null | void;
  investigationId: NumberOrString;
  startDate: string;
  title: string;
  type: string;
}

/** 'CreateTimelineEvent' return type */
export interface ICreateTimelineEventResult {
  id: string;
}

/** 'CreateTimelineEvent' query type */
export interface ICreateTimelineEventQuery {
  params: ICreateTimelineEventParams;
  result: ICreateTimelineEventResult;
}

const createTimelineEventIR: any = {
  usedParamSet: {
    investigationId: true,
    title: true,
    description: true,
    type: true,
    startDate: true,
    endDate: true,
  },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 117, b: 133 }],
    },
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 136, b: 142 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 145, b: 156 }],
    },
    { name: 'type', required: true, transform: { type: 'scalar' }, locs: [{ a: 159, b: 164 }] },
    {
      name: 'startDate',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 167, b: 177 }],
    },
    { name: 'endDate', required: false, transform: { type: 'scalar' }, locs: [{ a: 180, b: 187 }] },
  ],
  statement:
    'INSERT INTO investigation_timeline_events (investigation_id, title, description, type, start_date, end_date)\nVALUES (:investigationId!, :title!, :description, :type!, :startDate!, :endDate)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigation_timeline_events (investigation_id, title, description, type, start_date, end_date)
 * VALUES (:investigationId!, :title!, :description, :type!, :startDate!, :endDate)
 * RETURNING id
 * ```
 */
export const createTimelineEvent = new PreparedQuery<
  ICreateTimelineEventParams,
  ICreateTimelineEventResult
>(createTimelineEventIR);

/** 'UpdateTimelineEvent' parameters type */
export interface IUpdateTimelineEventParams {
  confidence?: number | null | void;
  description?: string | null | void;
  documents?: Json | null | void;
  endDate?: string | null | void;
  entities?: Json | null | void;
  id: NumberOrString;
  startDate?: string | null | void;
  title?: string | null | void;
  type?: string | null | void;
}

/** 'UpdateTimelineEvent' return type */
export type IUpdateTimelineEventResult = void;

/** 'UpdateTimelineEvent' query type */
export interface IUpdateTimelineEventQuery {
  params: IUpdateTimelineEventParams;
  result: IUpdateTimelineEventResult;
}

const updateTimelineEventIR: any = {
  usedParamSet: {
    title: true,
    description: true,
    type: true,
    startDate: true,
    endDate: true,
    confidence: true,
    entities: true,
    documents: true,
    id: true,
  },
  params: [
    { name: 'title', required: false, transform: { type: 'scalar' }, locs: [{ a: 61, b: 66 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 102, b: 113 }],
    },
    { name: 'type', required: false, transform: { type: 'scalar' }, locs: [{ a: 148, b: 152 }] },
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 186, b: 195 }],
    },
    { name: 'endDate', required: false, transform: { type: 'scalar' }, locs: [{ a: 233, b: 240 }] },
    {
      name: 'confidence',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 278, b: 288 }],
    },
    {
      name: 'entities',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 331, b: 339 }],
    },
    {
      name: 'documents',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 386, b: 395 }],
    },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 425, b: 428 }] },
  ],
  statement:
    'UPDATE investigation_timeline_events\nSET \n  title = COALESCE(:title, title),\n  description = COALESCE(:description, description),\n  type = COALESCE(:type, type),\n  start_date = COALESCE(:startDate, start_date),\n  end_date = COALESCE(:endDate, end_date),\n  confidence = COALESCE(:confidence, confidence),\n  entities_json = COALESCE(:entities, entities_json),\n  documents_json = COALESCE(:documents, documents_json)\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE investigation_timeline_events
 * SET
 *   title = COALESCE(:title, title),
 *   description = COALESCE(:description, description),
 *   type = COALESCE(:type, type),
 *   start_date = COALESCE(:startDate, start_date),
 *   end_date = COALESCE(:endDate, end_date),
 *   confidence = COALESCE(:confidence, confidence),
 *   entities_json = COALESCE(:entities, entities_json),
 *   documents_json = COALESCE(:documents, documents_json)
 * WHERE id = :id!
 * ```
 */
export const updateTimelineEvent = new PreparedQuery<
  IUpdateTimelineEventParams,
  IUpdateTimelineEventResult
>(updateTimelineEventIR);

/** 'DeleteTimelineEvent' parameters type */
export interface IDeleteTimelineEventParams {
  id: NumberOrString;
}

/** 'DeleteTimelineEvent' return type */
export type IDeleteTimelineEventResult = void;

/** 'DeleteTimelineEvent' query type */
export interface IDeleteTimelineEventQuery {
  params: IDeleteTimelineEventParams;
  result: IDeleteTimelineEventResult;
}

const deleteTimelineEventIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 53, b: 56 }] }],
  statement: 'DELETE FROM investigation_timeline_events WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM investigation_timeline_events WHERE id = :id!
 * ```
 */
export const deleteTimelineEvent = new PreparedQuery<
  IDeleteTimelineEventParams,
  IDeleteTimelineEventResult
>(deleteTimelineEventIR);

/** 'GetChainOfCustody' parameters type */
export interface IGetChainOfCustodyParams {
  evidenceId: NumberOrString;
}

/** 'GetChainOfCustody' return type */
export interface IGetChainOfCustodyResult {
  action: string | null;
  actor: string | null;
  date: Date | null;
  evidence_id: string | null;
  id: string;
  notes: string | null;
  signature: string | null;
}

/** 'GetChainOfCustody' query type */
export interface IGetChainOfCustodyQuery {
  params: IGetChainOfCustodyParams;
  result: IGetChainOfCustodyResult;
}

const getChainOfCustodyIR: any = {
  usedParamSet: { evidenceId: true },
  params: [
    { name: 'evidenceId', required: true, transform: { type: 'scalar' }, locs: [{ a: 51, b: 62 }] },
  ],
  statement: 'SELECT * FROM chain_of_custody WHERE evidence_id = :evidenceId! ORDER BY date ASC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM chain_of_custody WHERE evidence_id = :evidenceId! ORDER BY date ASC
 * ```
 */
export const getChainOfCustody = new PreparedQuery<
  IGetChainOfCustodyParams,
  IGetChainOfCustodyResult
>(getChainOfCustodyIR);

/** 'AddChainOfCustody' parameters type */
export interface IAddChainOfCustodyParams {
  action?: string | null | void;
  actor?: string | null | void;
  date: DateOrString;
  evidenceId: NumberOrString;
  notes?: string | null | void;
  signature?: string | null | void;
}

/** 'AddChainOfCustody' return type */
export interface IAddChainOfCustodyResult {
  id: string;
}

/** 'AddChainOfCustody' query type */
export interface IAddChainOfCustodyQuery {
  params: IAddChainOfCustodyParams;
  result: IAddChainOfCustodyResult;
}

const addChainOfCustodyIR: any = {
  usedParamSet: {
    evidenceId: true,
    date: true,
    actor: true,
    action: true,
    notes: true,
    signature: true,
  },
  params: [
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 90, b: 101 }],
    },
    { name: 'date', required: true, transform: { type: 'scalar' }, locs: [{ a: 104, b: 109 }] },
    { name: 'actor', required: false, transform: { type: 'scalar' }, locs: [{ a: 112, b: 117 }] },
    { name: 'action', required: false, transform: { type: 'scalar' }, locs: [{ a: 120, b: 126 }] },
    { name: 'notes', required: false, transform: { type: 'scalar' }, locs: [{ a: 129, b: 134 }] },
    {
      name: 'signature',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 137, b: 146 }],
    },
  ],
  statement:
    'INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature)\nVALUES (:evidenceId!, :date!, :actor, :action, :notes, :signature)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO chain_of_custody (evidence_id, date, actor, action, notes, signature)
 * VALUES (:evidenceId!, :date!, :actor, :action, :notes, :signature)
 * RETURNING id
 * ```
 */
export const addChainOfCustody = new PreparedQuery<
  IAddChainOfCustodyParams,
  IAddChainOfCustodyResult
>(addChainOfCustodyIR);

/** 'GetNotebook' parameters type */
export interface IGetNotebookParams {
  investigationId: NumberOrString;
}

/** 'GetNotebook' return type */
export interface IGetNotebookResult {
  annotations_json: Json | null;
  investigation_id: string;
  order_json: Json | null;
  updated_at: Date | null;
}

/** 'GetNotebook' query type */
export interface IGetNotebookQuery {
  params: IGetNotebookParams;
  result: IGetNotebookResult;
}

const getNotebookIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 62, b: 78 }],
    },
  ],
  statement: 'SELECT * FROM investigation_notebook WHERE investigation_id = :investigationId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM investigation_notebook WHERE investigation_id = :investigationId!
 * ```
 */
export const getNotebook = new PreparedQuery<IGetNotebookParams, IGetNotebookResult>(getNotebookIR);

/** 'SaveNotebook' parameters type */
export interface ISaveNotebookParams {
  annotationsJson: Json;
  investigationId: NumberOrString;
  orderJson: Json;
}

/** 'SaveNotebook' return type */
export type ISaveNotebookResult = void;

/** 'SaveNotebook' query type */
export interface ISaveNotebookQuery {
  params: ISaveNotebookParams;
  result: ISaveNotebookResult;
}

const saveNotebookIR: any = {
  usedParamSet: { investigationId: true, orderJson: true, annotationsJson: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 104, b: 120 }],
    },
    {
      name: 'orderJson',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 123, b: 133 }],
    },
    {
      name: 'annotationsJson',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 136, b: 152 }],
    },
  ],
  statement:
    'INSERT INTO investigation_notebook (investigation_id, order_json, annotations_json, updated_at)\nVALUES (:investigationId!, :orderJson!, :annotationsJson!, CURRENT_TIMESTAMP)\nON CONFLICT (investigation_id) DO UPDATE SET\n  order_json = EXCLUDED.order_json,\n  annotations_json = EXCLUDED.annotations_json,\n  updated_at = EXCLUDED.updated_at',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigation_notebook (investigation_id, order_json, annotations_json, updated_at)
 * VALUES (:investigationId!, :orderJson!, :annotationsJson!, CURRENT_TIMESTAMP)
 * ON CONFLICT (investigation_id) DO UPDATE SET
 *   order_json = EXCLUDED.order_json,
 *   annotations_json = EXCLUDED.annotations_json,
 *   updated_at = EXCLUDED.updated_at
 * ```
 */
export const saveNotebook = new PreparedQuery<ISaveNotebookParams, ISaveNotebookResult>(
  saveNotebookIR,
);

/** 'GetHypotheses' parameters type */
export interface IGetHypothesesParams {
  investigationId: NumberOrString;
}

/** 'GetHypotheses' return type */
export interface IGetHypothesesResult {
  confidence: number | null;
  created_at: Date | null;
  description: string | null;
  id: string;
  investigation_id: string | null;
  status: string | null;
  title: string;
  updated_at: Date | null;
}

/** 'GetHypotheses' query type */
export interface IGetHypothesesQuery {
  params: IGetHypothesesParams;
  result: IGetHypothesesResult;
}

const getHypothesesIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 50, b: 66 }],
    },
  ],
  statement:
    'SELECT * FROM hypotheses WHERE investigation_id = :investigationId! ORDER BY created_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM hypotheses WHERE investigation_id = :investigationId! ORDER BY created_at DESC
 * ```
 */
export const getHypotheses = new PreparedQuery<IGetHypothesesParams, IGetHypothesesResult>(
  getHypothesesIR,
);

/** 'GetHypothesisEvidence' parameters type */
export interface IGetHypothesisEvidenceParams {
  hypothesisId: NumberOrString;
}

/** 'GetHypothesisEvidence' return type */
export interface IGetHypothesisEvidenceResult {
  created_at: Date | null;
  evidence_id: string | null;
  evidence_title: string;
  evidence_type: string | null;
  hypothesis_id: string | null;
  id: string;
  relevance: string | null;
}

/** 'GetHypothesisEvidence' query type */
export interface IGetHypothesisEvidenceQuery {
  params: IGetHypothesisEvidenceParams;
  result: IGetHypothesisEvidenceResult;
}

const getHypothesisEvidenceIR: any = {
  usedParamSet: { hypothesisId: true },
  params: [
    {
      name: 'hypothesisId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 151, b: 164 }],
    },
  ],
  statement:
    'SELECT he.*, e.title as evidence_title, e.evidence_type \nFROM hypothesis_evidence he\nJOIN evidence e ON he.evidence_id = e.id\nWHERE he.hypothesis_id = :hypothesisId!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT he.*, e.title as evidence_title, e.evidence_type
 * FROM hypothesis_evidence he
 * JOIN evidence e ON he.evidence_id = e.id
 * WHERE he.hypothesis_id = :hypothesisId!
 * ```
 */
export const getHypothesisEvidence = new PreparedQuery<
  IGetHypothesisEvidenceParams,
  IGetHypothesisEvidenceResult
>(getHypothesisEvidenceIR);

/** 'CreateHypothesis' parameters type */
export interface ICreateHypothesisParams {
  description?: string | null | void;
  investigationId: NumberOrString;
  title: string;
}

/** 'CreateHypothesis' return type */
export interface ICreateHypothesisResult {
  id: string;
}

/** 'CreateHypothesis' query type */
export interface ICreateHypothesisQuery {
  params: ICreateHypothesisParams;
  result: ICreateHypothesisResult;
}

const createHypothesisIR: any = {
  usedParamSet: { investigationId: true, title: true, description: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 70, b: 86 }],
    },
    { name: 'title', required: true, transform: { type: 'scalar' }, locs: [{ a: 89, b: 95 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 98, b: 109 }],
    },
  ],
  statement:
    'INSERT INTO hypotheses (investigation_id, title, description)\nVALUES (:investigationId!, :title!, :description)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO hypotheses (investigation_id, title, description)
 * VALUES (:investigationId!, :title!, :description)
 * RETURNING id
 * ```
 */
export const createHypothesis = new PreparedQuery<ICreateHypothesisParams, ICreateHypothesisResult>(
  createHypothesisIR,
);

/** 'UpdateHypothesis' parameters type */
export interface IUpdateHypothesisParams {
  confidence?: number | null | void;
  description?: string | null | void;
  id: NumberOrString;
  status?: string | null | void;
  title?: string | null | void;
}

/** 'UpdateHypothesis' return type */
export type IUpdateHypothesisResult = void;

/** 'UpdateHypothesis' query type */
export interface IUpdateHypothesisQuery {
  params: IUpdateHypothesisParams;
  result: IUpdateHypothesisResult;
}

const updateHypothesisIR: any = {
  usedParamSet: { title: true, description: true, status: true, confidence: true, id: true },
  params: [
    { name: 'title', required: false, transform: { type: 'scalar' }, locs: [{ a: 42, b: 47 }] },
    {
      name: 'description',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 83, b: 94 }],
    },
    { name: 'status', required: false, transform: { type: 'scalar' }, locs: [{ a: 131, b: 137 }] },
    {
      name: 'confidence',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 173, b: 183 }],
    },
    { name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 243, b: 246 }] },
  ],
  statement:
    'UPDATE hypotheses\nSET \n  title = COALESCE(:title, title),\n  description = COALESCE(:description, description),\n  status = COALESCE(:status, status),\n  confidence = COALESCE(:confidence, confidence),\n  updated_at = CURRENT_TIMESTAMP\nWHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * UPDATE hypotheses
 * SET
 *   title = COALESCE(:title, title),
 *   description = COALESCE(:description, description),
 *   status = COALESCE(:status, status),
 *   confidence = COALESCE(:confidence, confidence),
 *   updated_at = CURRENT_TIMESTAMP
 * WHERE id = :id!
 * ```
 */
export const updateHypothesis = new PreparedQuery<IUpdateHypothesisParams, IUpdateHypothesisResult>(
  updateHypothesisIR,
);

/** 'DeleteHypothesis' parameters type */
export interface IDeleteHypothesisParams {
  id: NumberOrString;
}

/** 'DeleteHypothesis' return type */
export type IDeleteHypothesisResult = void;

/** 'DeleteHypothesis' query type */
export interface IDeleteHypothesisQuery {
  params: IDeleteHypothesisParams;
  result: IDeleteHypothesisResult;
}

const deleteHypothesisIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 34, b: 37 }] }],
  statement: 'DELETE FROM hypotheses WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM hypotheses WHERE id = :id!
 * ```
 */
export const deleteHypothesis = new PreparedQuery<IDeleteHypothesisParams, IDeleteHypothesisResult>(
  deleteHypothesisIR,
);

/** 'AddEvidenceToHypothesis' parameters type */
export interface IAddEvidenceToHypothesisParams {
  evidenceId: NumberOrString;
  hypothesisId: NumberOrString;
  relevance?: string | null | void;
}

/** 'AddEvidenceToHypothesis' return type */
export interface IAddEvidenceToHypothesisResult {
  id: string;
}

/** 'AddEvidenceToHypothesis' query type */
export interface IAddEvidenceToHypothesisQuery {
  params: IAddEvidenceToHypothesisParams;
  result: IAddEvidenceToHypothesisResult;
}

const addEvidenceToHypothesisIR: any = {
  usedParamSet: { hypothesisId: true, evidenceId: true, relevance: true },
  params: [
    {
      name: 'hypothesisId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 80, b: 93 }],
    },
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 96, b: 107 }],
    },
    {
      name: 'relevance',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 110, b: 119 }],
    },
  ],
  statement:
    'INSERT INTO hypothesis_evidence (hypothesis_id, evidence_id, relevance)\nVALUES (:hypothesisId!, :evidenceId!, :relevance)\nON CONFLICT DO NOTHING\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO hypothesis_evidence (hypothesis_id, evidence_id, relevance)
 * VALUES (:hypothesisId!, :evidenceId!, :relevance)
 * ON CONFLICT DO NOTHING
 * RETURNING id
 * ```
 */
export const addEvidenceToHypothesis = new PreparedQuery<
  IAddEvidenceToHypothesisParams,
  IAddEvidenceToHypothesisResult
>(addEvidenceToHypothesisIR);

/** 'RemoveEvidenceFromHypothesis' parameters type */
export interface IRemoveEvidenceFromHypothesisParams {
  evidenceId: NumberOrString;
  hypothesisId: NumberOrString;
}

/** 'RemoveEvidenceFromHypothesis' return type */
export type IRemoveEvidenceFromHypothesisResult = void;

/** 'RemoveEvidenceFromHypothesis' query type */
export interface IRemoveEvidenceFromHypothesisQuery {
  params: IRemoveEvidenceFromHypothesisParams;
  result: IRemoveEvidenceFromHypothesisResult;
}

const removeEvidenceFromHypothesisIR: any = {
  usedParamSet: { hypothesisId: true, evidenceId: true },
  params: [
    {
      name: 'hypothesisId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 55, b: 68 }],
    },
    { name: 'evidenceId', required: true, transform: { type: 'scalar' }, locs: [{ a: 88, b: 99 }] },
  ],
  statement:
    'DELETE FROM hypothesis_evidence \nWHERE hypothesis_id = :hypothesisId! AND evidence_id = :evidenceId!',
};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM hypothesis_evidence
 * WHERE hypothesis_id = :hypothesisId! AND evidence_id = :evidenceId!
 * ```
 */
export const removeEvidenceFromHypothesis = new PreparedQuery<
  IRemoveEvidenceFromHypothesisParams,
  IRemoveEvidenceFromHypothesisResult
>(removeEvidenceFromHypothesisIR);

/** 'LogActivity' parameters type */
export interface ILogActivityParams {
  actionType: string;
  investigationId: NumberOrString;
  metadata?: Json | null | void;
  targetId?: string | null | void;
  targetTitle?: string | null | void;
  targetType?: string | null | void;
  userId?: string | null | void;
  userName?: string | null | void;
}

/** 'LogActivity' return type */
export interface ILogActivityResult {
  id: string;
}

/** 'LogActivity' query type */
export interface ILogActivityQuery {
  params: ILogActivityParams;
  result: ILogActivityResult;
}

const logActivityIR: any = {
  usedParamSet: {
    investigationId: true,
    userId: true,
    userName: true,
    actionType: true,
    targetType: true,
    targetId: true,
    targetTitle: true,
    metadata: true,
  },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 155, b: 171 }],
    },
    { name: 'userId', required: false, transform: { type: 'scalar' }, locs: [{ a: 174, b: 180 }] },
    {
      name: 'userName',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 183, b: 191 }],
    },
    {
      name: 'actionType',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 194, b: 205 }],
    },
    {
      name: 'targetType',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 208, b: 218 }],
    },
    {
      name: 'targetId',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 221, b: 229 }],
    },
    {
      name: 'targetTitle',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 232, b: 243 }],
    },
    {
      name: 'metadata',
      required: false,
      transform: { type: 'scalar' },
      locs: [{ a: 246, b: 254 }],
    },
  ],
  statement:
    'INSERT INTO investigation_activity (\n  investigation_id, user_id, user_name, action_type, \n  target_type, target_id, target_title, metadata_json\n) VALUES (:investigationId!, :userId, :userName, :actionType!, :targetType, :targetId, :targetTitle, :metadata)\nRETURNING id',
};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO investigation_activity (
 *   investigation_id, user_id, user_name, action_type,
 *   target_type, target_id, target_title, metadata_json
 * ) VALUES (:investigationId!, :userId, :userName, :actionType!, :targetType, :targetId, :targetTitle, :metadata)
 * RETURNING id
 * ```
 */
export const logActivity = new PreparedQuery<ILogActivityParams, ILogActivityResult>(logActivityIR);

/** 'GetActivity' parameters type */
export interface IGetActivityParams {
  investigationId: NumberOrString;
  limit: NumberOrString;
}

/** 'GetActivity' return type */
export interface IGetActivityResult {
  action_type: string;
  created_at: Date | null;
  id: string;
  investigation_id: string | null;
  metadata_json: Json | null;
  target_id: string | null;
  target_title: string | null;
  target_type: string | null;
  user_id: string | null;
  user_name: string | null;
}

/** 'GetActivity' query type */
export interface IGetActivityQuery {
  params: IGetActivityParams;
  result: IGetActivityResult;
}

const getActivityIR: any = {
  usedParamSet: { investigationId: true, limit: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 62, b: 78 }],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 111, b: 117 }] },
  ],
  statement:
    'SELECT * FROM investigation_activity\nWHERE investigation_id = :investigationId!\nORDER BY created_at DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM investigation_activity
 * WHERE investigation_id = :investigationId!
 * ORDER BY created_at DESC
 * LIMIT :limit!
 * ```
 */
export const getActivity = new PreparedQuery<IGetActivityParams, IGetActivityResult>(getActivityIR);

/** 'GetDetailedEvidence' parameters type */
export interface IGetDetailedEvidenceParams {
  investigationId: NumberOrString;
}

/** 'GetDetailedEvidence' return type */
export interface IGetDetailedEvidenceResult {
  added_at: Date | null;
  added_by: string | null;
  description: string | null;
  document_id: string;
  id: string;
  investigation_evidence_id: string;
  media_item_id: string;
  metadata_json: Json | null;
  notes: string | null;
  red_flag_rating: number | null;
  relevance: string | null;
  source_path: string | null;
  title: string;
  type: string | null;
}

/** 'GetDetailedEvidence' query type */
export interface IGetDetailedEvidenceQuery {
  params: IGetDetailedEvidenceParams;
  result: IGetDetailedEvidenceResult;
}

const getDetailedEvidenceIR: any = {
  usedParamSet: { investigationId: true },
  params: [
    {
      name: 'investigationId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 485, b: 501 }],
    },
  ],
  statement:
    'SELECT \n  e.id, \n  e.evidence_type as type, \n  e.title, \n  e.description, \n  e.source_path,\n  e.metadata_json,\n  ie.id as investigation_evidence_id,\n  d.id as document_id,\n  m.id as media_item_id,\n  e.red_flag_rating,\n  ie.relevance, \n  ie.added_at, \n  ie.added_by,\n  ie.notes\nFROM investigation_evidence ie\nJOIN evidence e ON ie.evidence_id = e.id\nLEFT JOIN documents d ON d.file_path = e.source_path\nLEFT JOIN media_items m ON m.file_path = e.source_path\nWHERE ie.investigation_id = :investigationId! \nORDER BY ie.added_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   e.id,
 *   e.evidence_type as type,
 *   e.title,
 *   e.description,
 *   e.source_path,
 *   e.metadata_json,
 *   ie.id as investigation_evidence_id,
 *   d.id as document_id,
 *   m.id as media_item_id,
 *   e.red_flag_rating,
 *   ie.relevance,
 *   ie.added_at,
 *   ie.added_by,
 *   ie.notes
 * FROM investigation_evidence ie
 * JOIN evidence e ON ie.evidence_id = e.id
 * LEFT JOIN documents d ON d.file_path = e.source_path
 * LEFT JOIN media_items m ON m.file_path = e.source_path
 * WHERE ie.investigation_id = :investigationId!
 * ORDER BY ie.added_at DESC
 * ```
 */
export const getDetailedEvidence = new PreparedQuery<
  IGetDetailedEvidenceParams,
  IGetDetailedEvidenceResult
>(getDetailedEvidenceIR);

/** 'GetInvestigationsByEvidenceId' parameters type */
export interface IGetInvestigationsByEvidenceIdParams {
  evidenceId: NumberOrString;
}

/** 'GetInvestigationsByEvidenceId' return type */
export interface IGetInvestigationsByEvidenceIdResult {
  assigned_to: string | null;
  collaborator_ids: string | null;
  created_at: Date | null;
  created_by: string | null;
  description: string | null;
  id: string;
  metadata_json: Json | null;
  owner_id: string | null;
  priority: string | null;
  scope: string | null;
  status: string | null;
  title: string;
  updated_at: Date | null;
  uuid: string | null;
}

/** 'GetInvestigationsByEvidenceId' query type */
export interface IGetInvestigationsByEvidenceIdQuery {
  params: IGetInvestigationsByEvidenceIdParams;
  result: IGetInvestigationsByEvidenceIdResult;
}

const getInvestigationsByEvidenceIdIR: any = {
  usedParamSet: { evidenceId: true },
  params: [
    {
      name: 'evidenceId',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 127, b: 138 }],
    },
  ],
  statement:
    'SELECT DISTINCT i.* \nFROM investigations i\nJOIN investigation_evidence ie ON i.id = ie.investigation_id\nWHERE ie.evidence_id = :evidenceId!\nORDER BY i.updated_at DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT DISTINCT i.*
 * FROM investigations i
 * JOIN investigation_evidence ie ON i.id = ie.investigation_id
 * WHERE ie.evidence_id = :evidenceId!
 * ORDER BY i.updated_at DESC
 * ```
 */
export const getInvestigationsByEvidenceId = new PreparedQuery<
  IGetInvestigationsByEvidenceIdParams,
  IGetInvestigationsByEvidenceIdResult
>(getInvestigationsByEvidenceIdIR);
