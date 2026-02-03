-- Add foreign key for bookmarks.novel_id with CASCADE
ALTER TABLE bookmarks 
DROP CONSTRAINT IF EXISTS bookmarks_novel_id_fkey;

ALTER TABLE bookmarks 
ADD CONSTRAINT bookmarks_novel_id_fkey 
FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE;

-- Add foreign key for comments.parent_id with CASCADE
ALTER TABLE comments 
DROP CONSTRAINT IF EXISTS comments_parent_id_fkey;

ALTER TABLE comments 
ADD CONSTRAINT comments_parent_id_fkey 
FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE;

-- Add foreign key for story_graph_nodes.project_id with CASCADE
ALTER TABLE story_graph_nodes 
DROP CONSTRAINT IF EXISTS story_graph_nodes_project_id_fkey;

ALTER TABLE story_graph_nodes 
ADD CONSTRAINT story_graph_nodes_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES ai_story_projects(id) ON DELETE CASCADE;

-- Add foreign key for story_graph_edges.project_id with CASCADE
ALTER TABLE story_graph_edges 
DROP CONSTRAINT IF EXISTS story_graph_edges_project_id_fkey;

ALTER TABLE story_graph_edges 
ADD CONSTRAINT story_graph_edges_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES ai_story_projects(id) ON DELETE CASCADE;