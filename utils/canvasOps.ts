import type Konva from 'konva';

export const getElementContainer = (node: Konva.Shape) => {
  if (node.name() === 'element-container') {
    return node;
  }

  return node.findAncestor('.element-container');
};

export const getNodeById = (stage: Konva.Stage, id: string) => {
  return stage.findOne(`#${id}`);
};

export const attachNodesToTransformer = (transformer: Konva.Transformer, nodes: Konva.Node[]) => {
  console.log(nodes);
  const attachedNodes = transformer.nodes();
  const newNodes = nodes.filter(
    node => node && !attachedNodes.includes(node),
  );

  console.log(`Attaching ${newNodes.map(n => n.id()).join(', ')} to transformer`);
  transformer.nodes(attachedNodes.concat(newNodes));
};

export const detachNodesFromTransformer = (transformer: Konva.Transformer, nodes: Konva.Node[]) => {
  const attachedNodes = transformer.nodes();
  const newNodes = attachedNodes.filter(
    node => node && !nodes.includes(node),
  );

  console.log(`Detaching ${newNodes.map(n => n.id()).join(', ')} from transformer`);
  transformer.nodes(newNodes);
};
