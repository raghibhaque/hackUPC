"""
Semantic Analysis — matches fields that are structurally similar
but named differently.

Uses token-based similarity with synonym expansion.
"""

from __future__ import annotations

import re
import math
from functools import lru_cache


SYNONYMS: dict[str, str] = {
    "id": "id", "identifier": "id", "uid": "id", "guid": "id",
    "pk": "id", "key": "id", "oid": "id",
    "user": "user", "account": "user", "member": "user",
    "author": "user", "owner": "user", "creator": "user",
    "person": "user", "profile": "user",
    "name": "name", "title": "name", "label": "name",
    "display_name": "name", "full_name": "name", "username": "name",
    "slug": "slug", "handle": "slug", "alias": "slug",
    "email": "email", "mail": "email", "email_address": "email",
    "content": "content", "body": "content", "text": "content",
    "html": "content", "markdown": "content", "description": "content",
    "excerpt": "content", "summary": "content", "abstract": "content",
    "created_at": "created", "createdat": "created", "created_on": "created",
    "created": "created", "date_created": "created", "creation_date": "created",
    "date_added": "created", "insert_date": "created",
    "updated_at": "updated", "updatedat": "updated", "updated_on": "updated",
    "updated": "updated", "modified": "updated", "date_modified": "updated",
    "last_modified": "updated", "modification_date": "updated",
    "edited_at": "updated", "changed_at": "updated",
    "deleted_at": "deleted", "deletedat": "deleted", "removed_at": "deleted",
    "status": "status", "state": "status", "active": "status",
    "enabled": "status", "visibility": "status",
    "type": "type", "kind": "type", "category": "type",
    "class": "type", "group": "type",
    "url": "url", "uri": "url", "link": "url", "href": "url",
    "path": "url", "permalink": "url",
    "image": "image", "photo": "image", "avatar": "image",
    "picture": "image", "thumbnail": "image", "icon": "image",
    "cover": "image", "logo": "image", "feature_image": "image",
    "count": "count", "total": "count", "num": "count", "number": "count",
    "order": "order", "sort": "order", "position": "order",
    "rank": "order", "priority": "order", "sort_order": "order",
    "menu_order": "order",
    "parent": "parent", "parent_id": "parent",
    "password": "password", "pass": "password", "hash": "password",
    "password_hash": "password",
    "meta": "meta", "metadata": "meta", "settings": "meta",
    "options": "meta", "config": "meta", "preferences": "meta",
    "role": "role", "permission": "role", "access": "role",
    "capability": "role", "privilege": "role", 
    "post_content": "content", "post_title": "name",
    "post_excerpt": "content", "post_name": "slug",
    "post_status": "status", "post_type": "type",
    "post_author": "user", "post_date": "created",
    "post_modified": "updated", "post_parent": "parent",
    "comment_content": "content", "comment_date": "created",
    "comment_author": "user", "comment_approved": "status",
    "comment_post_id": "id",
    "user_login": "name", "user_email": "email",
    "user_pass": "password", "user_registered": "created",
    "user_nicename": "slug", "user_url": "url",
    "display_name": "name", "user_status": "status",
    "option_name": "name", "option_value": "content",
    "term_id": "id", "term_group": "type",
    "menu_order": "order", "comment_count": "count",
    "guid": "id", "post_mime_type": "type",
}

TABLE_SYNONYMS: dict[str, str] = {
    "users": "users", "accounts": "users", "members": "users",
    "authors": "users", "profiles": "users", "people": "users",
    "user": "users", "account": "users", "member": "users",
    "posts": "posts", "articles": "posts", "entries": "posts",
    "stories": "posts", "content": "posts", "pages": "posts",
    "post": "posts", "article": "posts", "entry": "posts",
    "comments": "comments", "replies": "comments", "feedback": "comments",
    "responses": "comments", "discussions": "comments",
    "comment": "comments", "reply": "comments",
    "tags": "tags", "labels": "tags", "keywords": "tags",
    "terms": "tags", "term": "tags",
    "categories": "categories", "topics": "categories", "groups": "categories",
    "term_taxonomy": "categories",
    "posts_tags": "post_tags", "post_tags": "post_tags",
    "term_relationships": "post_tags",
    "roles": "roles", "permissions": "roles",
    "roles_users": "user_roles", "user_roles": "user_roles",
    "settings": "settings", "options": "settings", "config": "settings",
    "preferences": "settings", "meta": "settings",
    "sessions": "sessions", "tokens": "sessions", "auth": "sessions",
    "media": "media", "uploads": "media", "files": "media",
    "attachments": "media", "images": "media",
    "subscriptions": "subscriptions", "plans": "subscriptions",
    "memberships": "subscriptions",
    "newsletters": "newsletters", "emails": "newsletters",
    "integrations": "integrations", "webhooks": "integrations",
    "api_keys": "integrations",
    "usermeta": "user_meta", "postmeta": "post_meta",
    "commentmeta": "comment_meta",
    "links": "links", "bookmarks": "links",
}


def tokenise(name: str) -> list[str]:
    name = re.sub(r"([a-z])([A-Z])", r"\1_\2", name)
    tokens = re.split(r"[_\-\.]+", name.lower())
    return [t for t in tokens if t and len(t) > 0]


def canonicalise_tokens(tokens: list[str]) -> list[str]:
    result = []
    for t in tokens:
        if t in SYNONYMS:
            result.append(SYNONYMS[t])
        else:
            result.append(t)
    return result


@lru_cache(maxsize=4096)
def semantic_similarity_names(name_a: str, name_b: str) -> float:
    if name_a == name_b:
        return 1.0

    tokens_a = tokenise(name_a)
    tokens_b = tokenise(name_b)

    set_a = set(tokens_a)
    set_b = set(tokens_b)

    if set_a == set_b:
        return 0.95

    canon_a = set(canonicalise_tokens(tokens_a))
    canon_b = set(canonicalise_tokens(tokens_b))

    if canon_a == canon_b:
        return 0.90

    intersection = canon_a & canon_b
    union = canon_a | canon_b

    if not union:
        return 0.0

    jaccard = len(intersection) / len(union)

    if tokens_a and tokens_b:
        core_a = canonicalise_tokens([tokens_a[-1]])[0]
        core_b = canonicalise_tokens([tokens_b[-1]])[0]
        if core_a == core_b:
            jaccard = max(jaccard, 0.6)

    lev_sim = 1.0 - _normalised_levenshtein(name_a, name_b)
    if lev_sim > 0.8:
        jaccard = max(jaccard, lev_sim * 0.85)

    return min(jaccard, 1.0)


def semantic_similarity_tables(name_a: str, name_b: str) -> float:
    if name_a == name_b:
        return 1.0

    clean_a = re.sub(r"^(wp_|ghost_|app_|tbl_|t_)", "", name_a)
    clean_b = re.sub(r"^(wp_|ghost_|app_|tbl_|t_)", "", name_b)

    if clean_a == clean_b:
        return 0.95

    canon_a = TABLE_SYNONYMS.get(clean_a, clean_a)
    canon_b = TABLE_SYNONYMS.get(clean_b, clean_b)

    if canon_a == canon_b:
        return 0.90

    return semantic_similarity_names(clean_a, clean_b)


class EmbeddingEngine:
    def __init__(self):
        self.model = None
        self._available = False

    def load(self, model_name: str = "all-MiniLM-L6-v2") -> bool:
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
            self._available = True
            return True
        except (ImportError, Exception):
            self._available = False
            return False

    @property
    def available(self) -> bool:
        return self._available

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self._available or not self.model:
            return [[] for _ in texts]
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return [e.tolist() for e in embeddings]

    def similarity(self, text_a: str, text_b: str) -> float:
        if not self._available:
            return 0.0
        vecs = self.embed([text_a, text_b])
        return _cosine_similarity(vecs[0], vecs[1])


embedding_engine = EmbeddingEngine()


def contextual_column_description(col_name: str, table_name: str) -> str:
    tokens = tokenise(col_name)
    table_tokens = tokenise(table_name)
    return f"{' '.join(table_tokens)} {' '.join(tokens)}"


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(y * y for y in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _normalised_levenshtein(s1: str, s2: str) -> float:
    if s1 == s2:
        return 0.0
    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 0.0

    rows = len(s1) + 1
    cols = len(s2) + 1
    prev = list(range(cols))
    for i in range(1, rows):
        curr = [i] + [0] * (cols - 1)
        for j in range(1, cols):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            curr[j] = min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
        prev = curr

    return prev[-1] / max_len